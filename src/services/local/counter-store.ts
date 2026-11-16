import { z } from "zod";
import { createPersistentStore } from "@/lib/persistent-store";
import { MAX_ITEM_QUANTITY, MAX_NOTES_LENGTH } from "@/lib/orders";

const safeCents = z.number().int().nonnegative().refine(Number.isSafeInteger);
export const counterDraftSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY),
        notes: z.string().max(MAX_NOTES_LENGTH),
        reviewedPriceCents: safeCents,
        reviewedName: z.string(),
        reviewedCategoryId: z.string(),
      }),
    )
    .refine((lines) => new Set(lines.map((l) => l.productId)).size === lines.length),
  customerName: z.string().max(60),
  notes: z.string().max(MAX_NOTES_LENGTH),
  paymentMethod: z.enum(["pix", "dinheiro", "cartao"]),
  paid: z.boolean(),
  cash: z.string().max(30),
  lastSale: z
    .object({
      orderId: z.string(),
      receivedCents: safeCents.nullable(),
      changeCents: safeCents.nullable(),
    })
    .nullable(),
});
export type CounterDraft = z.infer<typeof counterDraftSchema>;
export const COUNTER_CART_KEY = "padaria-digital:demo:counter-cart:v1";
export const createCounterDraft = (): CounterDraft => ({
  lines: [],
  customerName: "",
  notes: "",
  paymentMethod: "pix",
  paid: false,
  cash: "",
  lastSale: null,
});
export const parseCounterDraft = (raw: unknown): CounterDraft | null => {
  const result = counterDraftSchema.safeParse(raw);
  return result.success ? result.data : null;
};
export const counterCartStore = createPersistentStore(
  COUNTER_CART_KEY,
  createCounterDraft,
  parseCounterDraft,
);
