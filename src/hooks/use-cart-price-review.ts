import { useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { useStore } from "@/contexts/StoreContext";

export function useCartPriceReview() {
  const { lines, acknowledgePrices } = useCart();
  const { data } = useStore();
  const missingBaseline =
    !!data &&
    (lines ?? []).some(
      (line) =>
        line.reviewedPriceCents === undefined && data.products.some((p) => p.id === line.productId),
    );
  useEffect(() => {
    if (missingBaseline) acknowledgePrices(true);
  }, [missingBaseline, acknowledgePrices]);
  const changes = (lines ?? []).flatMap((line) => {
    const product = data?.products.find((p) => p.id === line.productId);
    return product &&
      line.reviewedPriceCents !== undefined &&
      line.reviewedPriceCents !== product.priceCents
      ? [{ name: product.name, before: line.reviewedPriceCents, after: product.priceCents }]
      : [];
  });
  return { changes, acknowledgePrices };
}
