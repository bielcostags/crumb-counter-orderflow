import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { localServices } from "@/services/local";
import { cartStore, dataStore } from "@/services/local/store";

const checkout = {
  customerName: "Cliente Exemplo",
  customerPhone: "00900000000",
  fulfillment: "retirada" as const,
  paymentMethod: "pix" as const,
};
const lines = [{ productId: "p-pao-frances", quantity: 2 }];
async function complete<T>(operation: Promise<T>) {
  const result = operation.then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  await vi.runAllTimersAsync();
  const settled = await result;
  if ("error" in settled) throw settled.error;
  return settled.value;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-16T16:00:00Z"));
  dataStore.reset();
  cartStore.reset();
});
afterEach(() => vi.useRealTimers());

describe("Serviço local de pedidos", () => {
  it("coloca online e balcão na mesma fila com números únicos e limpa o carrinho online", async () => {
    cartStore.set(lines);
    const online = await complete(localServices.orders.createOnlineOrder(checkout, lines));
    const counter = await complete(
      localServices.orders.createCounterOrder({ lines, paid: true, paymentMethod: "dinheiro" }),
    );
    expect(online).toMatchObject({
      channel: "online",
      status: "pendente",
      paymentStatus: "pendente",
      totalCents: 240,
    });
    expect(counter).toMatchObject({
      channel: "balcao",
      fulfillment: "retirada",
      paymentStatus: "pago",
    });
    expect(counter.number).toBe(online.number + 1);
    expect(dataStore.get().orders).toEqual(expect.arrayContaining([online, counter]));
    expect(cartStore.get()).toEqual([]);
  });
  it("rejeita checkout inválido sem alterar fila ou carrinho", async () => {
    const before = dataStore.get();
    cartStore.set(lines);
    await expect(
      complete(
        localServices.orders.createOnlineOrder({ ...checkout, fulfillment: "entrega" }, lines),
      ),
    ).rejects.toThrow();
    expect(dataStore.get()).toBe(before);
    expect(cartStore.get()).toEqual(lines);
  });
  it("valida pagamento e quantidades do balcão em runtime", async () => {
    const before = dataStore.get();
    const invalid = { lines, paid: true, paymentMethod: "boleto" } as unknown as Parameters<
      typeof localServices.orders.createCounterOrder
    >[0];
    await expect(complete(localServices.orders.createCounterOrder(invalid))).rejects.toThrow();
    await expect(
      complete(
        localServices.orders.createCounterOrder({ lines: [], paid: false, paymentMethod: "pix" }),
      ),
    ).rejects.toThrow();
    expect(dataStore.get()).toBe(before);
  });
  it("registra histórico, bloqueia saltos e impede pagamento de cancelados", async () => {
    const order = await complete(localServices.orders.createOnlineOrder(checkout, lines));
    await expect(
      complete(localServices.orders.updateStatus(order.id, "concluido")),
    ).rejects.toThrow();
    const preparing = await complete(localServices.orders.updateStatus(order.id, "em_preparacao"));
    expect(preparing.history.map((event) => event.status)).toEqual(["pendente", "em_preparacao"]);
    const paid = await complete(localServices.orders.markPaid(order.id));
    expect(paid.paymentStatus).toBe("pago");
    await complete(localServices.orders.updateStatus(order.id, "cancelado"));
    await expect(complete(localServices.orders.markPaid(order.id))).rejects.toThrow();
    await expect(
      complete(localServices.orders.updateStatus(order.id, "pendente")),
    ).rejects.toThrow();
  });
});

describe("Revalidação do pedido online", () => {
  it("rejeita carrinho vazio sem registrar pedido", async () => {
    const before = dataStore.get();
    await expect(complete(localServices.orders.createOnlineOrder(checkout, []))).rejects.toThrow();
    expect(dataStore.get()).toBe(before);
  });
  it("revalida disponibilidade e preserva o carrinho ao falhar", async () => {
    cartStore.set(lines);
    dataStore.set((s) => ({ ...s, products: s.products.map((p) => ({ ...p, available: false })) }));
    const before = dataStore.get();
    await expect(complete(localServices.orders.createOnlineOrder(checkout, lines))).rejects.toThrow(
      "indisponível",
    );
    expect(cartStore.get()).toEqual(lines);
    expect(dataStore.get()).toBe(before);
  });
  it("recalcula o preço atual do catálogo no registro", async () => {
    dataStore.set((s) => ({
      ...s,
      products: s.products.map((p) =>
        p.id === lines[0]!.productId ? { ...p, priceCents: 150 } : p,
      ),
    }));
    const order = await complete(localServices.orders.createOnlineOrder(checkout, lines));
    expect(order.totalCents).toBe(300);
    expect(order.items[0]?.unitPriceCents).toBe(150);
    expect(await complete(localServices.orders.getOrderByNumber(order.number))).toEqual(order);
    expect(await complete(localServices.orders.getOrderByNumber(999999))).toBeNull();
  });
  it.each(["retirada", "entrega"] as const)("executa todo o fluxo de %s", async (fulfillment) => {
    const order = await complete(
      localServices.orders.createOnlineOrder(
        { ...checkout, fulfillment, address: "Rua Fictícia, 123" },
        lines,
      ),
    );
    const statuses =
      fulfillment === "entrega"
        ? (["em_preparacao", "pronto", "saiu_para_entrega", "concluido"] as const)
        : (["em_preparacao", "pronto", "concluido"] as const);
    for (const status of statuses)
      await complete(localServices.orders.updateStatus(order.id, status));
    const saved = await complete(localServices.orders.getOrderByNumber(order.number));
    expect(saved?.status).toBe("concluido");
    expect(saved?.history.map((e) => e.status)).toEqual(["pendente", ...statuses]);
    await expect(
      complete(localServices.orders.updateStatus(order.id, "cancelado")),
    ).rejects.toThrow();
  });
});

describe("Recebimento demonstrativo", () => {
  it("bloqueia recebimento repetido sem alterar valor nem histórico", async () => {
    const order = await complete(localServices.orders.createOnlineOrder(checkout, lines));
    const paid = await complete(localServices.orders.markPaid(order.id));
    await expect(complete(localServices.orders.markPaid(order.id))).rejects.toThrow(
      "já marcado como pago",
    );
    expect(dataStore.get().orders[0]).toEqual(paid);
    expect(paid.totalCents).toBe(order.totalCents);
    expect(paid.history).toEqual(order.history);
  });
  it("mantém recebimento independente da conclusão do preparo", async () => {
    const order = await complete(localServices.orders.createOnlineOrder(checkout, lines));
    for (const status of ["em_preparacao", "pronto", "concluido"] as const)
      await complete(localServices.orders.updateStatus(order.id, status));
    const paid = await complete(localServices.orders.markPaid(order.id));
    expect(paid).toMatchObject({
      status: "concluido",
      paymentStatus: "pago",
      totalCents: order.totalCents,
    });
  });
});
