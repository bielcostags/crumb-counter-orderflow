import type { StoreData } from "@/types";

export interface CatalogImageReference {
  productId: string;
  name: string;
  categoryId: string;
  url: string;
}

/** Preenche somente imagens vazias de produtos reconhecidos; preserva todo o resto. */
export function fillMissingCatalogImages(
  data: StoreData,
  references: readonly CatalogImageReference[],
): StoreData {
  const byId = new Map(references.map((reference) => [reference.productId, reference]));
  let changed = false;
  const products = data.products.map((product) => {
    if (!product || typeof product !== "object") return product;
    const reference = byId.get(product.id);
    if (
      !reference ||
      product.name !== reference.name ||
      product.categoryId !== reference.categoryId
    )
      return product;
    if (typeof product.imageUrl === "string" && product.imageUrl.trim()) return product;
    changed = true;
    return { ...product, imageUrl: reference.url };
  });
  return changed ? { ...data, products } : data;
}
