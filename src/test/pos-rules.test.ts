import { createSeedStore as createTechnicalStore } from "@/test/fixtures/catalog";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { calculateCashChange } from "@/lib/pos";
import { buildOrderItems, computeDayMetrics, computeLastDays } from "@/lib/orders";
import { counterCartActions } from "@/contexts/counter-cart";
import { localServices } from "@/services/local";
import { dataStore, cartStore } from "@/services/local/store";
import {
  counterCartStore,
  COUNTER_CART_KEY,
  createCounterDraft,
  parseCounterDraft,
} from "@/services/local/counter-store";
import { createPersistentStore } from "@/lib/persistent-store";

beforeEach(() => {
  vi.useFakeTimers();
  dataStore.set(createTechnicalStore(new Date()));
  cartStore.reset();
  counterCartStore.reset();
});
afterEach(() => vi.useRealTimers());
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
const input = {
  paymentMethod: "pix" as const,
  paid: false,
  lines: [{ productId: "p-pao-frances", quantity: 2 }],
};
describe("Troco demonstrativo", () => {
  it.each([
    ["50,00", 5000, 1750],
    ["32,50", 3250, 0],
    ["", null, null],
  ])("calcula %s", (received, receivedCents, changeCents) => {
    expect(calculateCashChange(3250, received as string)).toEqual({ receivedCents, changeCents });
  });
  it.each(["32,49", "-1", "abc", "1,234", "9999999999999999999999"])(
    "rejeita recebido %s",
    (received) => {
      expect(() => calculateCashChange(3250, received)).toThrow();
    },
  );
});
describe("Registro presencial e integridade", () => {
  it("rehidrata a confirmação gravada sem reenviar a venda", async () => {
    const order = await complete(
      localServices.orders.createCounterOrder({ ...input, paymentMethod: "dinheiro", paid: true }),
    );
    counterCartActions.complete(order, { receivedCents: 500, changeCents: 260 });
    const before = dataStore.get().orders;
    const restored = createPersistentStore(
      COUNTER_CART_KEY,
      createCounterDraft,
      parseCounterDraft,
    ).get();
    expect(restored.lines).toEqual([]);
    expect(restored.lastSale).toEqual({ orderId: order.id, receivedCents: 500, changeCents: 260 });
    expect(dataStore.get().orders).toBe(before);
  });
  it.each(["pix", "dinheiro", "cartao"] as const)(
    "registra %s anônimo, sem tocar o carrinho público",
    async (paymentMethod) => {
      cartStore.set(input.lines);
      const order = await complete(
        localServices.orders.createCounterOrder({ ...input, paymentMethod, paid: true }),
      );
      expect(order).toMatchObject({
        channel: "balcao",
        fulfillment: "retirada",
        status: "pendente",
        paymentStatus: "pago",
        paymentMethod,
        totalCents: 240,
      });
      expect(order.customerName).toBeUndefined();
      expect(order.history).toHaveLength(1);
      expect(cartStore.get()).toEqual(input.lines);
    },
  );
  it.each(["price", "name", "category", "unavailable", "inactive"])(
    "rejeita mudança %s entre a prévia e o registro",
    async (kind) => {
      const data = dataStore.get();
      const product = data.products[0]!;
      const quote = buildOrderItems(input.lines, data.products, data.categories).map((item) => ({
        ...item,
        categoryId: product.categoryId,
      }));
      if (kind === "unavailable")
        await complete(localServices.catalog.setProductAvailable(product.id, false));
      else if (kind === "inactive")
        await complete(localServices.catalog.setCategoryActive(product.categoryId, false));
      else
        await complete(
          localServices.catalog.saveProduct(
            {
              ...product,
              ...(kind === "price"
                ? { priceCents: 150 }
                : kind === "name"
                  ? { name: "Novo nome" }
                  : { categoryId: "cat-bolos" }),
            },
            product.id,
          ),
        );
      const before = dataStore.get();
      await expect(
        complete(localServices.orders.createCounterOrder(input, quote)),
      ).rejects.toThrow();
      expect(dataStore.get()).toBe(before);
    },
  );
  it("atualiza métricas sem contabilizar valor entregue e preserva histórico após edição", async () => {
    const before = computeDayMetrics(dataStore.get().orders, new Date());
    const order = await complete(
      localServices.orders.createCounterOrder({
        ...input,
        paid: true,
        customerName: "Mesa Exemplo",
        notes: "Observação",
        paymentMethod: "dinheiro",
      }),
    );
    const after = computeDayMetrics(dataStore.get().orders, new Date());
    expect(after.paidCents - before.paidCents).toBe(240);
    expect(after.counterCount - before.counterCount).toBe(1);
    expect(after.orderedCents - before.orderedCents).toBe(240);
    expect(computeLastDays(dataStore.get().orders, new Date()).at(-1)?.pagas).toBe(
      after.paidCents / 100,
    );
    const product = dataStore.get().products[0]!;
    await complete(
      localServices.catalog.saveProduct(
        { ...product, name: "Outro pão", priceCents: 200 },
        product.id,
      ),
    );
    await complete(localServices.catalog.setCategoryActive(product.categoryId, false));
    expect(dataStore.get().orders.find((o) => o.id === order.id)).toEqual(order);
  });
  it("rehidrata o rascunho completo e rejeita quantidades inválidas persistidas", () => {
    counterCartStore.set({
      ...createCounterDraft(),
      customerName: "Mesa Exemplo",
      notes: "Observação",
      lines: [
        {
          ...input.lines[0]!,
          notes: "Separar",
          reviewedName: "Pão francês",
          reviewedPriceCents: 120,
          reviewedCategoryId: "cat-paes",
        },
      ],
    });
    const restored = createPersistentStore(COUNTER_CART_KEY, createCounterDraft, parseCounterDraft);
    expect(restored.get()).toEqual(counterCartStore.get());
    for (const quantity of [0, -1, 1.5, 100])
      expect(
        parseCounterDraft({
          ...counterCartStore.get(),
          lines: [{ ...counterCartStore.get().lines[0], quantity }],
        }),
      ).toBeNull();
  });
});
