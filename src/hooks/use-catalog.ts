import { useMemo } from "react";

import { useStore } from "@/contexts/StoreContext";
import { isProductSellable } from "@/lib/orders";
import type { Category, Product } from "@/types";

/** Visão do catálogo para a área pública: só categorias ativas e seus produtos. */
export function usePublicCatalog() {
  const { data } = useStore();
  return useMemo(() => {
    if (!data) return null;
    const categories = [...data.categories]
      .filter((c) => c.active)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const activeIds = new Set(categories.map((c) => c.id));
    const products = data.products.filter((p) => activeIds.has(p.categoryId));
    return {
      categories,
      products,
      isSellable: (p: Product) => isProductSellable(p, data.categories),
      productById: (id: string) => data.products.find((p) => p.id === id),
      allCategories: data.categories as Category[],
    };
  }, [data]);
}
