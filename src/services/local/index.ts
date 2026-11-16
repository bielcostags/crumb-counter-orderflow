/**
 * Implementação LOCAL dos contratos de serviço (somente demonstração).
 * Simula uma pequena latência de rede para exercitar estados de carregamento.
 */
import type { AppServices, CatalogService, DemoService, OrderService } from "@/services/contracts";
import {
  buildOrderItems,
  calcTotalCents,
  canTransition,
  checkoutSchema,
  MAX_NOTES_LENGTH,
  nextOrderNumber,
  OrderValidationError,
  STATUS_LABELS,
} from "@/lib/orders";
import { onlyDigits, formatPhone } from "@/lib/format";
import type { Category, Order, Product } from "@/types";

import { cartStore, dataStore } from "./store";

const LATENCY_MS = 250;
const delay = () => new Promise((r) => setTimeout(r, LATENCY_MS));
const newId = (prefix: string) =>
  `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString(36)}`;

function findOrder(id: string): Order {
  const order = dataStore.get().orders.find((o) => o.id === id);
  if (!order) throw new OrderValidationError("Pedido não encontrado.");
  return order;
}

function replaceOrder(updated: Order) {
  dataStore.set((s) => ({ ...s, orders: s.orders.map((o) => (o.id === updated.id ? updated : o)) }));
}

const catalog: CatalogService = {
  async listCategories() {
    await delay();
    return dataStore.get().categories;
  },
  async saveCategory(input, id) {
    await delay();
    const name = input.name.trim();
    if (name.length < 2) throw new OrderValidationError("Nome da categoria muito curto.");
    const { categories } = dataStore.get();
    if (categories.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
      throw new OrderValidationError("Já existe uma categoria com esse nome.");
    }
    let saved: Category;
    if (id) {
      const current = categories.find((c) => c.id === id);
      if (!current) throw new OrderValidationError("Categoria não encontrada.");
      saved = { ...current, name, description: input.description?.trim() || undefined, active: input.active };
      dataStore.set((s) => ({ ...s, categories: s.categories.map((c) => (c.id === id ? saved : c)) }));
    } else {
      saved = {
        id: newId("cat"),
        name,
        description: input.description?.trim() || undefined,
        active: input.active,
        sortOrder: categories.reduce((m, c) => Math.max(m, c.sortOrder), 0) + 1,
      };
      dataStore.set((s) => ({ ...s, categories: [...s.categories, saved] }));
    }
    return saved;
  },
  async setCategoryActive(id, active) {
    await delay();
    const current = dataStore.get().categories.find((c) => c.id === id);
    if (!current) throw new OrderValidationError("Categoria não encontrada.");
    const saved = { ...current, active };
    dataStore.set((s) => ({ ...s, categories: s.categories.map((c) => (c.id === id ? saved : c)) }));
    return saved;
  },
  async listProducts() {
    await delay();
    return dataStore.get().products;
  },
  async saveProduct(input, id) {
    await delay();
    const name = input.name.trim();
    if (name.length < 2) throw new OrderValidationError("Nome do produto muito curto.");
    if (!Number.isInteger(input.priceCents) || input.priceCents <= 0)
      throw new OrderValidationError("O preço deve ser maior que zero.");
    if (!dataStore.get().categories.some((c) => c.id === input.categoryId))
      throw new OrderValidationError("Selecione uma categoria válida.");
    let saved: Product;
    if (id) {
      const current = dataStore.get().products.find((p) => p.id === id);
      if (!current) throw new OrderValidationError("Produto não encontrado.");
      saved = { ...current, ...input, name, description: input.description.trim() };
      dataStore.set((s) => ({ ...s, products: s.products.map((p) => (p.id === id ? saved : p)) }));
    } else {
      saved = { id: newId("p"), ...input, name, description: input.description.trim() };
      dataStore.set((s) => ({ ...s, products: [...s.products, saved] }));
    }
    return saved;
  },
  async setProductAvailable(id, available) {
    await delay();
    const current = dataStore.get().products.find((p) => p.id === id);
    if (!current) throw new OrderValidationError("Produto não encontrado.");
    const saved = { ...current, available };
    dataStore.set((s) => ({ ...s, products: s.products.map((p) => (p.id === id ? saved : p)) }));
    return saved;
  },
};

const orders: OrderService = {
  async listOrders() {
    await delay();
    return dataStore.get().orders;
  },
  async getOrderByNumber(number) {
    await delay();
    return dataStore.get().orders.find((o) => o.number === number) ?? null;
  },
  async createOnlineOrder(rawInput, lines) {
    await delay();
    const parsed = checkoutSchema.safeParse(rawInput);
    if (!parsed.success) throw new OrderValidationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
    const input = parsed.data;
    const { products, categories, orders: all } = dataStore.get();
    const items = buildOrderItems(lines, products, categories);
    const now = new Date().toISOString();
    const order: Order = {
      id: newId("o"),
      number: nextOrderNumber(all),
      channel: "online",
      fulfillment: input.fulfillment,
      status: "pendente",
      paymentMethod: input.paymentMethod,
      paymentStatus: "pendente",
      customerName: input.customerName.trim(),
      customerPhone: formatPhone(onlyDigits(input.customerPhone)),
      address: input.fulfillment === "entrega" ? input.address?.trim() : undefined,
      notes: input.notes?.trim() || undefined,
      items,
      totalCents: calcTotalCents(items),
      createdAt: now,
      updatedAt: now,
      history: [{ status: "pendente", at: now }],
    };
    dataStore.set((s) => ({ ...s, orders: [order, ...s.orders] }));
    cartStore.set([]);
    return order;
  },
  async createCounterOrder(input) {
    await delay();
    const { products, categories, orders: all } = dataStore.get();
    const items = buildOrderItems(input.lines, products, categories);
    const now = new Date().toISOString();
    const order: Order = {
      id: newId("o"),
      number: nextOrderNumber(all),
      channel: "balcao",
      fulfillment: "retirada",
      status: "pendente",
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paid ? "pago" : "pendente",
      customerName: input.customerName?.trim().slice(0, 60) || undefined,
      notes: input.notes?.trim().slice(0, MAX_NOTES_LENGTH) || undefined,
      items,
      totalCents: calcTotalCents(items),
      createdAt: now,
      updatedAt: now,
      history: [{ status: "pendente", at: now }],
    };
    dataStore.set((s) => ({ ...s, orders: [order, ...s.orders] }));
    return order;
  },
  async updateStatus(orderId, to) {
    await delay();
    const order = findOrder(orderId);
    if (!canTransition(order, to)) {
      throw new OrderValidationError(
        `Não é possível mudar de "${STATUS_LABELS[order.status]}" para "${STATUS_LABELS[to]}".`,
      );
    }
    const now = new Date().toISOString();
    const updated: Order = { ...order, status: to, updatedAt: now, history: [...order.history, { status: to, at: now }] };
    replaceOrder(updated);
    return updated;
  },
  async markPaid(orderId) {
    await delay();
    const order = findOrder(orderId);
    if (order.status === "cancelado") throw new OrderValidationError("Pedido cancelado não pode ser marcado como pago.");
    const updated: Order = { ...order, paymentStatus: "pago", updatedAt: new Date().toISOString() };
    replaceOrder(updated);
    return updated;
  },
};

const demo: DemoService = {
  async resetDemoData() {
    await delay();
    dataStore.reset();
    cartStore.reset();
  },
};

export const localServices: AppServices = { catalog, orders, demo };
