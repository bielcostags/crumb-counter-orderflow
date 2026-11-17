import { describe, expect, it } from "vitest";
import { createSeedCategories, createSeedProducts, createSeedStore } from "@/test/fixtures/catalog";
import {
  buildOrderItems,
  calcTotalCents,
  canTransition,
  checkoutSchema,
  computeDayMetrics,
  getStatusFlow,
  isValidQuantity,
  nextOrderNumber,
} from "@/lib/orders";
import { parseBRLToCents } from "@/lib/format";
import type { OrderStatus } from "@/types";

const products = createSeedProducts();
const categories = createSeedCategories();
const lines = [{ productId: "p-pao-frances", quantity: 2, notes: "  Separar  " }];

describe("Itens e valores do pedido", () => {
  it("calcula em centavos e preserva o snapshot do catálogo", () => {
    const catalog = structuredClone(products);
    const items = buildOrderItems(lines, catalog, categories);
    catalog[0]!.name = "Alterado";
    catalog[0]!.priceCents = 999;
    expect(items[0]).toMatchObject({
      name: "Pão francês",
      unitPriceCents: 120,
      subtotalCents: 240,
      notes: "Separar",
    });
    expect(calcTotalCents(items)).toBe(240);
  });
  it.each([0, -1, 1.5, 100, NaN, Infinity])("rejeita quantidade %s", (quantity) => {
    expect(isValidQuantity(quantity)).toBe(false);
    expect(() => buildOrderItems([{ ...lines[0]!, quantity }], products, categories)).toThrow();
  });
  it("aceita os limites de quantidade", () => {
    expect(isValidQuantity(1)).toBe(true);
    expect(isValidQuantity(99)).toBe(true);
  });
  it("rejeita carrinho vazio, produto ausente, indisponível e categoria inativa", () => {
    expect(() => buildOrderItems([], products, categories)).toThrow();
    expect(() =>
      buildOrderItems([{ productId: "ausente", quantity: 1 }], products, categories),
    ).toThrow();
    expect(() =>
      buildOrderItems([{ productId: "p-empada", quantity: 1 }], products, categories),
    ).toThrow();
    expect(() =>
      buildOrderItems(
        lines,
        products,
        categories.map((c) => ({ ...c, active: false })),
      ),
    ).toThrow();
  });
  it("rejeita linhas duplicadas e preços inválidos", () => {
    expect(() => buildOrderItems([...lines, ...lines], products, categories)).toThrow();
    for (const priceCents of [0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER]) {
      expect(() =>
        buildOrderItems(
          lines,
          products.map((p) => ({ ...p, priceCents })),
          categories,
        ),
      ).toThrow();
    }
    expect(() =>
      calcTotalCents([{ subtotalCents: Number.MAX_SAFE_INTEGER }, { subtotalCents: 1 }]),
    ).toThrow();
  });
  it.each([
    ["12,50", 1250],
    ["12.50", 1250],
    ["R$ 1.234,56", 123456],
    ["12", 1200],
  ])("converte %s", (input, expected) => {
    expect(parseBRLToCents(input)).toBe(expected);
  });
  it.each(["abc", "-1", "1.234", "1.2,50", "1,234", ""])("rejeita preço %s", (input) => {
    expect(parseBRLToCents(input)).toBeNaN();
  });
});

describe("Checkout e status", () => {
  const input = {
    customerName: "Cliente fictício",
    customerPhone: "00900000000",
    fulfillment: "retirada",
    paymentMethod: "pix",
  };
  it("valida telefone, nome, pagamento e endereço de entrega", () => {
    expect(checkoutSchema.safeParse(input).success).toBe(true);
    for (const patch of [
      { customerName: "A" },
      { customerPhone: "123" },
      { paymentMethod: "boleto" },
      { fulfillment: "entrega" },
    ]) {
      expect(checkoutSchema.safeParse({ ...input, ...patch }).success).toBe(false);
    }
    expect(
      checkoutSchema.safeParse({ ...input, fulfillment: "entrega", address: "Rua Exemplo, 10" })
        .success,
    ).toBe(true);
  });
  it.each(["retirada", "entrega"] as const)(
    "permite somente avanço sequencial para %s",
    (fulfillment) => {
      const flow = getStatusFlow(fulfillment);
      const statuses: OrderStatus[] = [...getStatusFlow("entrega"), "cancelado"];
      for (const status of statuses)
        for (const to of statuses) {
          const index = flow.indexOf(status);
          const expected =
            status !== "cancelado" &&
            status !== "concluido" &&
            (to === "cancelado" || (index >= 0 && to === flow[index + 1]));
          expect(canTransition({ status, fulfillment }, to)).toBe(expected);
        }
    },
  );
  it("gera número acima do maior número existente", () => {
    expect(nextOrderNumber([])).toBe(1001);
    expect(nextOrderNumber([{ number: 1030 }, { number: 1001 }])).toBe(1031);
  });
  it("distingue valor pedido, valor pago e cancelamentos", () => {
    const now = new Date(2026, 10, 16, 12);
    const order = createSeedStore(now).orders[0]!;
    const orders = [
      {
        ...order,
        createdAt: now.toISOString(),
        status: "pendente" as const,
        paymentStatus: "pendente" as const,
        totalCents: 1000,
      },
      {
        ...order,
        createdAt: now.toISOString(),
        status: "concluido" as const,
        paymentStatus: "pago" as const,
        totalCents: 2000,
      },
      {
        ...order,
        createdAt: now.toISOString(),
        status: "cancelado" as const,
        paymentStatus: "pago" as const,
        totalCents: 5000,
      },
      order,
    ];
    expect(computeDayMetrics(orders, now)).toMatchObject({
      ordersCount: 2,
      orderedCents: 3000,
      paidCents: 2000,
      avgTicketCents: 1500,
      cancelledCount: 1,
      pendingCount: 1,
    });
  });
});
