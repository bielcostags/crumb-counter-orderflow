import { createContext, useContext } from "react";
import {
  counterCartStore,
  createCounterDraft,
  type CounterDraft,
} from "@/services/local/counter-store";
import { dataStore } from "@/services/local/store";
import {
  isProductSellable,
  isValidQuantity,
  MAX_ITEM_QUANTITY,
  MAX_NOTES_LENGTH,
} from "@/lib/orders";
import type { Order } from "@/types";

function add(productId: string) {
  const data = dataStore.get();
  const product = data.products.find((p) => p.id === productId);
  if (!product || !isProductSellable(product, data.categories)) return;
  counterCartStore.set((draft) => {
    const existing = draft.lines.find((l) => l.productId === productId);
    if (existing)
      return {
        ...draft,
        lines: draft.lines.map((l) =>
          l.productId === productId
            ? { ...l, quantity: Math.min(MAX_ITEM_QUANTITY, l.quantity + 1) }
            : l,
        ),
      };
    return {
      ...draft,
      lastSale: null,
      lines: [
        ...draft.lines,
        {
          productId,
          quantity: 1,
          notes: "",
          reviewedPriceCents: product.priceCents,
          reviewedName: product.name,
          reviewedCategoryId: product.categoryId,
        },
      ],
    };
  });
}
function quantity(productId: string, value: number) {
  if (!isValidQuantity(value)) return;
  counterCartStore.set((d) => ({
    ...d,
    lines: d.lines.map((l) => (l.productId === productId ? { ...l, quantity: value } : l)),
  }));
}
function itemNotes(productId: string, value: string) {
  counterCartStore.set((d) => ({
    ...d,
    lines: d.lines.map((l) =>
      l.productId === productId ? { ...l, notes: value.slice(0, MAX_NOTES_LENGTH) } : l,
    ),
  }));
}
function remove(productId: string) {
  counterCartStore.set((d) => ({ ...d, lines: d.lines.filter((l) => l.productId !== productId) }));
}
function update(
  fields: Partial<Pick<CounterDraft, "customerName" | "notes" | "paymentMethod" | "paid" | "cash">>,
) {
  counterCartStore.set((d) => ({
    ...d,
    ...fields,
    ...((fields.paymentMethod !== undefined && fields.paymentMethod !== d.paymentMethod) ||
    (fields.paid !== undefined && fields.paid !== d.paid)
      ? { cash: "" }
      : {}),
  }));
}
function review() {
  const data = dataStore.get();
  counterCartStore.set((d) => ({
    ...d,
    lines: d.lines.map((line) => {
      const product = data.products.find((p) => p.id === line.productId);
      return product
        ? {
            ...line,
            reviewedPriceCents: product.priceCents,
            reviewedName: product.name,
            reviewedCategoryId: product.categoryId,
          }
        : line;
    }),
  }));
}
function clear() {
  counterCartStore.set(createCounterDraft());
}
function complete(
  order: Order,
  cash: { receivedCents: number | null; changeCents: number | null },
) {
  counterCartStore.set({ ...createCounterDraft(), lastSale: { orderId: order.id, ...cash } });
}
export const counterCartActions = {
  add,
  quantity,
  itemNotes,
  remove,
  update,
  review,
  clear,
  complete,
};
export const CounterCartContext = createContext<
  ({ draft: CounterDraft | null } & typeof counterCartActions) | null
>(null);
export function useCounterCart() {
  const value = useContext(CounterCartContext);
  if (!value) throw new Error("useCounterCart requer CounterCartProvider.");
  return value;
}
