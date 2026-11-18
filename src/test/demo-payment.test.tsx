import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openCatalog } from "./helpers/catalog-router";
import { demoEmployeeSession } from "./helpers/demo-session";
import { adminSessionStore, cartStore, dataStore } from "@/services/local/store";
import { counterCartStore } from "@/services/local/counter-store";
import { localServices } from "@/services/local";
import { createSeedStore } from "./fixtures/catalog";
const input = {
  customerName: "Cliente Exemplo",
  customerPhone: "00900000000",
  fulfillment: "retirada" as const,
  paymentMethod: "dinheiro" as const,
};
const lines = [{ productId: "p-pao-frances", quantity: 1 }];
beforeEach(() => {
  dataStore.set(createSeedStore(new Date()));
  cartStore.set(lines);
  counterCartStore.reset();
  adminSessionStore.set(demoEmployeeSession);
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function fill() {
  fireEvent.change(screen.getByLabelText(/Nome do cliente/), {
    target: { value: input.customerName },
  });
  fireEvent.change(screen.getByLabelText(/Telefone com DDD/), {
    target: { value: input.customerPhone },
  });
}
describe("Troco e integração local", () => {
  it.each([
    [120, 0],
    [500, 380],
  ])("registra previsão %i sem marcar pago", async (amount, change) => {
    const order = await localServices.orders.createOnlineOrder(
      { ...input, cashAmountCents: amount },
      lines,
    );
    expect(order.cashAmountCents! - order.totalCents).toBe(change);
    expect(order.paymentStatus).toBe("pendente");
    expect(order.totalCents).toBe(120);
  });
  it.each([100, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "recusa valor monetário %s no serviço sem limpar carrinho",
    async (amount) => {
      await expect(
        localServices.orders.createOnlineOrder({ ...input, cashAmountCents: amount }, lines),
      ).rejects.toThrow();
      expect(cartStore.get()).toEqual(lines);
    },
  );
  it("mantém compatibilidade com pedido antigo sem campo de dinheiro", async () => {
    const order = await localServices.orders.createOnlineOrder(input, lines);
    expect(order.cashAmountCents).toBeUndefined();
    expect(order.paymentStatus).toBe("pendente");
  });
  it.each(["pix", "cartao"] as const)("não persiste troco para %s", async (method) => {
    const order = await localServices.orders.createOnlineOrder(
      { ...input, paymentMethod: method, cashAmountCents: 500 },
      lines,
    );
    expect(order.cashAmountCents).toBeUndefined();
  });
  it("checkout calcula troco e limpa campo ao escolher Pix/Cartão", async () => {
    await openCatalog("/checkout");
    fill();
    const select = screen.getByLabelText("Forma de pagamento ao receber");
    fireEvent.change(select, { target: { value: "dinheiro" } });
    const cash = screen.getByLabelText(/Vai pagar com quanto/);
    fireEvent.change(cash, { target: { value: "1,00" } });
    expect(screen.getByRole("button", { name: "Confirmar pedido" })).toBeDisabled();
    fireEvent.change(cash, { target: { value: "abc" } });
    expect(screen.getByRole("button", { name: "Confirmar pedido" })).toBeDisabled();
    fireEvent.change(cash, { target: { value: "1,20" } });
    expect(screen.getByText(/Troco necessário/)).toHaveTextContent("Sem troco");
    for (const method of ["pix", "cartao"]) {
      fireEvent.change(select, { target: { value: method } });
      expect(screen.queryByLabelText(/Vai pagar com quanto/)).not.toBeInTheDocument();
      fireEvent.change(select, { target: { value: "dinheiro" } });
      expect(screen.getByLabelText(/Vai pagar com quanto/)).toHaveValue("");
    }
    fireEvent.change(screen.getByLabelText(/Vai pagar com quanto/), { target: { value: "5,00" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));
    await screen.findByText("Pedido registrado com sucesso!");
    expect(screen.getByText(/Troco previsto:/)).toHaveTextContent("3,80");
    expect(dataStore.get().orders[0]?.paymentStatus).toBe("pendente");
  });
  it("checkout offline registra endereço completo, e funcionário vê endereço e troco", async () => {
    const router = await openCatalog("/checkout");
    fill();
    fireEvent.change(screen.getByLabelText("Tipo de recebimento"), {
      target: { value: "entrega" },
    });
    fireEvent.change(screen.getByLabelText("CEP"), { target: { value: "00000000" } });
    await screen.findByText(/Não foi possível consultar o CEP/);
    for (const [label, value] of [
      ["Rua/logradouro", "Rua Manual"],
      ["Número", "10"],
      ["Bairro", "Centro"],
      ["Cidade", "Cidade Exemplo"],
      ["Estado/UF", "RO"],
      ["Complemento (opcional)", "Casa"],
    ])
      fireEvent.change(screen.getByLabelText(label!), { target: { value } });
    fireEvent.change(screen.getByLabelText("Forma de pagamento ao receber"), {
      target: { value: "dinheiro" },
    });
    fireEvent.change(screen.getByLabelText(/Vai pagar com quanto/), { target: { value: "5,00" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));
    await screen.findByText("Pedido registrado com sucesso!");
    const order = dataStore.get().orders[0]!;
    expect(screen.getByText(/Endereço de entrega:/)).toHaveTextContent(order.address!);
    expect(order.address).toContain("Rua Manual, 10, Casa — Centro, Cidade Exemplo/RO");
    await act(async () => {
      await router.navigate({ to: "/admin/pedidos" });
    });
    fireEvent.click(
      await screen.findByRole("button", { name: `Detalhes do pedido ${order.number}` }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(order.address!)).toBeInTheDocument();
    expect(within(dialog).getByText(/Troco previsto:/)).toHaveTextContent("3,80");
  });
  it("PDV exige valor recebido apenas para dinheiro pago e preserva troco no comprovante", async () => {
    await openCatalog("/admin/balcao");
    fireEvent.click(
      await screen.findByRole("button", { name: "Adicionar Pão francês ao pedido de balcão" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Finalizar pedido de balcão" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Forma de pagamento"), {
      target: { value: "dinheiro" },
    });
    expect(within(dialog).queryByLabelText(/Valor entregue/)).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Registrar venda" })).toBeEnabled();
    fireEvent.change(within(dialog).getByLabelText("Situação do pagamento"), {
      target: { value: "paid" },
    });
    expect(within(dialog).getByRole("button", { name: "Registrar venda" })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/Valor entregue/), {
      target: { value: "5,00" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Registrar venda" }));
    await screen.findByText("Venda registrada com sucesso!");
    expect(dataStore.get().orders[0]).toMatchObject({
      cashAmountCents: 500,
      totalCents: 120,
      paymentStatus: "pago",
    });
    const receipt = screen.getByRole("region", { name: "Comprovante" });
    expect(receipt).toHaveTextContent("SEM VALOR FISCAL");
    expect(within(receipt).getByText(/Troco:/)).toHaveTextContent("3,80");
  });
  it("PDV dinheiro pendente aceita registro sem recebimento", async () => {
    await openCatalog("/admin/balcao");
    fireEvent.click(
      await screen.findByRole("button", { name: "Adicionar Pão francês ao pedido de balcão" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Finalizar pedido de balcão" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Forma de pagamento"), {
      target: { value: "dinheiro" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Registrar venda" }));
    await screen.findByText("Venda registrada com sucesso!");
    expect(dataStore.get().orders[0]).toMatchObject({ paymentStatus: "pendente" });
    expect(dataStore.get().orders[0]?.cashAmountCents).toBeUndefined();
  });
  it("preserva troco de venda antiga salvo apenas no rascunho", async () => {
    const order = {
      ...dataStore.get().orders[0]!,
      channel: "balcao" as const,
      paymentMethod: "dinheiro" as const,
      paymentStatus: "pago" as const,
      totalCents: 120,
    };
    dataStore.set((prev) => ({ ...prev, orders: [order] }));
    counterCartStore.set((prev) => ({
      ...prev,
      lastSale: { orderId: order.id, receivedCents: 500, changeCents: 380 },
    }));
    await openCatalog("/admin/balcao");
    const receipt = await screen.findByRole("region", { name: "Comprovante" });
    expect(within(receipt).getByText(/Troco:/)).toHaveTextContent("3,80");
    expect(dataStore.get().orders[0]?.cashAmountCents).toBeUndefined();
  });
});
