import { useCounterCart } from "@/contexts/counter-cart";
import { useStore } from "@/contexts/StoreContext";
import { buildOrderItems, calcTotalCents } from "@/lib/orders";
import type { OrderQuoteItem } from "@/lib/orders";

export function usePOSQuote() {
  const { draft } = useCounterCart();
  const { data } = useStore();
  let items: OrderQuoteItem[] = [];
  let total = 0;
  let error = "";
  const changes = (draft?.lines ?? []).flatMap((line) => {
    const product = data?.products.find((p) => p.id === line.productId);
    return product &&
      (product.priceCents !== line.reviewedPriceCents ||
        product.name !== line.reviewedName ||
        product.categoryId !== line.reviewedCategoryId)
      ? [
          `${line.reviewedName}: dados do catálogo alterados. Agora ${product.name}. Revise o preço e a categoria.`,
        ]
      : [];
  });
  if (data && draft?.lines.length) {
    try {
      items = buildOrderItems(draft.lines, data.products, data.categories).map((item) => ({
        ...item,
        categoryId: data.products.find((p) => p.id === item.productId)!.categoryId,
      }));
      total = calcTotalCents(items);
    } catch (err) {
      error = err instanceof Error ? err.message : "Revise os itens selecionados.";
    }
  }
  return { items, total, error, changes };
}
