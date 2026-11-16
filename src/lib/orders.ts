/**
 * Regras de negócio puras (sem React, sem storage).
 * Na fase com Supabase, estas mesmas regras devem rodar no servidor
 * (server function / função SQL) — o cliente nunca é a fonte da verdade.
 */
import { z } from "zod";

import { onlyDigits } from "@/lib/format";
import type {
  CartLine,
  Category,
  FulfillmentType,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Product,
} from "@/types";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pendente: "Pendente",
  em_preparacao: "Em preparação",
  pronto: "Pronto",
  saiu_para_entrega: "Saiu para entrega",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
};

export const FULFILLMENT_LABELS: Record<FulfillmentType, string> = {
  retirada: "Retirada",
  entrega: "Entrega",
};

export const KANBAN_COLUMNS: OrderStatus[] = [
  "pendente",
  "em_preparacao",
  "pronto",
  "saiu_para_entrega",
  "concluido",
  "cancelado",
];

export const MAX_ITEM_QUANTITY = 99;
export const MAX_NOTES_LENGTH = 200;

export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderValidationError";
  }
}

/** Fluxo de status. Retirada (inclui balcão) não passa por "saiu para entrega". */
export function getStatusFlow(fulfillment: FulfillmentType): OrderStatus[] {
  return fulfillment === "entrega"
    ? ["pendente", "em_preparacao", "pronto", "saiu_para_entrega", "concluido"]
    : ["pendente", "em_preparacao", "pronto", "concluido"];
}

export function isFinalStatus(status: OrderStatus): boolean {
  return status === "concluido" || status === "cancelado";
}

export function getNextStatus(order: Pick<Order, "status" | "fulfillment">): OrderStatus | null {
  if (isFinalStatus(order.status)) return null;
  const flow = getStatusFlow(order.fulfillment);
  const idx = flow.indexOf(order.status);
  if (idx === -1 || idx === flow.length - 1) return null;
  return flow[idx + 1] ?? null;
}

export function canCancel(order: Pick<Order, "status">): boolean {
  return !isFinalStatus(order.status);
}

export function canTransition(
  order: Pick<Order, "status" | "fulfillment">,
  to: OrderStatus,
): boolean {
  if (to === "cancelado") return canCancel(order);
  return getNextStatus(order) === to;
}

export function isValidQuantity(q: number): boolean {
  return Number.isInteger(q) && q >= 1 && q <= MAX_ITEM_QUANTITY;
}

/** Um produto pode ser vendido se está disponível e sua categoria está ativa. */
export function isProductSellable(product: Product, categories: Category[]): boolean {
  const cat = categories.find((c) => c.id === product.categoryId);
  return product.available && !!cat?.active;
}

/**
 * Constrói os itens do pedido a partir do carrinho usando o catálogo atual
 * (preço e nome vêm do catálogo, nunca do cliente) e grava um snapshot.
 */
export function buildOrderItems(
  lines: CartLine[],
  products: Product[],
  categories: Category[],
): OrderItem[] {
  if (lines.length === 0) throw new OrderValidationError("O pedido precisa ter ao menos um item.");
  const seen = new Set<string>();
  return lines.map((line) => {
    if (seen.has(line.productId)) throw new OrderValidationError("Produto repetido no pedido.");
    seen.add(line.productId);
    const product = products.find((p) => p.id === line.productId);
    if (!product) throw new OrderValidationError("Um dos produtos não existe mais no cardápio.");
    if (!isProductSellable(product, categories))
      throw new OrderValidationError(`"${product.name}" está indisponível no momento.`);
    if (!isValidQuantity(line.quantity))
      throw new OrderValidationError(`Quantidade inválida para "${product.name}".`);
    if (
      !Number.isSafeInteger(product.priceCents) ||
      product.priceCents <= 0 ||
      !Number.isSafeInteger(product.priceCents * line.quantity)
    )
      throw new OrderValidationError(`Preço inválido para "${product.name}".`);
    const notes = line.notes?.trim().slice(0, MAX_NOTES_LENGTH) || undefined;
    return {
      productId: product.id,
      name: product.name,
      unitPriceCents: product.priceCents,
      quantity: line.quantity,
      notes,
      subtotalCents: product.priceCents * line.quantity,
    };
  });
}

export function calcTotalCents(items: Pick<OrderItem, "subtotalCents">[]): number {
  return items.reduce((sum, i) => {
    const total = sum + i.subtotalCents;
    if (
      !Number.isSafeInteger(i.subtotalCents) ||
      i.subtotalCents < 0 ||
      !Number.isSafeInteger(total)
    )
      throw new OrderValidationError("Total do pedido inválido.");
    return total;
  }, 0);
}

export function countItems(items: { quantity: number }[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

/** Próximo número único (sequencial local). No Supabase: sequence/identity no banco. */
export function nextOrderNumber(orders: Pick<Order, "number">[]): number {
  return orders.reduce((max, o) => Math.max(max, o.number), 1000) + 1;
}

export const checkoutSchema = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(2, "Informe um nome (fictício) com ao menos 2 letras.")
      .max(60, "Nome muito longo."),
    customerPhone: z.string().refine((v) => {
      const d = onlyDigits(v);
      return d.length === 10 || d.length === 11;
    }, "Informe um telefone com DDD (10 ou 11 dígitos)."),
    fulfillment: z.enum(["retirada", "entrega"], {
      errorMap: () => ({ message: "Escolha retirada ou entrega." }),
    }),
    address: z.string().trim().max(160, "Endereço muito longo.").optional(),
    paymentMethod: z.enum(["pix", "dinheiro", "cartao"], {
      errorMap: () => ({ message: "Escolha a forma de pagamento." }),
    }),
    notes: z.string().trim().max(MAX_NOTES_LENGTH, "Observação muito longa.").optional(),
  })
  .superRefine((val, ctx) => {
    if (val.fulfillment === "entrega" && (!val.address || val.address.trim().length < 8)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["address"],
        message: "Informe o endereço de entrega (rua, número e bairro).",
      });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const counterOrderSchema = z.object({
  customerName: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(MAX_NOTES_LENGTH).optional(),
  paymentMethod: z.enum(["pix", "dinheiro", "cartao"]),
  paid: z.boolean(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY),
        notes: z.string().max(MAX_NOTES_LENGTH).optional(),
      }),
    )
    .min(1, "O pedido precisa ter ao menos um item."),
});

export interface CounterOrderInput {
  customerName?: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  paid: boolean;
  lines: CartLine[];
}

/* ---------- Métricas (dashboard/relatórios derivados dos dados mock) ---------- */

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export interface DayMetrics {
  /** Pedidos realizados (exclui cancelados). */
  ordersCount: number;
  /** Valor total dos pedidos realizados (pago ou não). */
  orderedCents: number;
  /** Vendas efetivamente pagas (pagamento marcado como pago, não cancelado). */
  paidCents: number;
  avgTicketCents: number;
  pendingCount: number;
  cancelledCount: number;
  onlineCount: number;
  counterCount: number;
}

export function computeDayMetrics(orders: Order[], day: Date): DayMetrics {
  const ofDay = orders.filter((o) => isSameDay(new Date(o.createdAt), day));
  const valid = ofDay.filter((o) => o.status !== "cancelado");
  const orderedCents = calcTotalCents(valid.map((o) => ({ subtotalCents: o.totalCents })));
  const paidCents = valid
    .filter((o) => o.paymentStatus === "pago")
    .reduce((s, o) => s + o.totalCents, 0);
  return {
    ordersCount: valid.length,
    orderedCents,
    paidCents,
    avgTicketCents: valid.length ? Math.round(orderedCents / valid.length) : 0,
    pendingCount: ofDay.filter((o) => o.status === "pendente").length,
    cancelledCount: ofDay.filter((o) => o.status === "cancelado").length,
    onlineCount: valid.filter((o) => o.channel === "online").length,
    counterCount: valid.filter((o) => o.channel === "balcao").length,
  };
}

export function computeLastDays(
  orders: Order[],
  now: Date,
  days = 7,
): { label: string; date: string; pedidos: number; pagas: number }[] {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = startOfDay(now);
    d.setDate(d.getDate() - i);
    const m = computeDayMetrics(orders, d);
    out.push({
      label: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
      date: d.toISOString(),
      pedidos: m.orderedCents / 100,
      pagas: m.paidCents / 100,
    });
  }
  return out;
}
