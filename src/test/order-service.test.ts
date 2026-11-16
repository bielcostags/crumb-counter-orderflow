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
