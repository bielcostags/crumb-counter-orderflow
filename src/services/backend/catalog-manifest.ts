import { createSeedCategories, createSeedProducts } from "@/data/mock";

/** Pure, reviewable import payload. No storage, orders, user data or network access. */
export function createCatalogImportManifest() {
  return {
    source: "vila-rica-cardapio-v1" as const,
    categories: createSeedCategories().map((category) => ({
      source_id: category.id,
      name: category.name,
      description: category.description ?? "",
      active: category.active,
      sort_order: category.sortOrder,
    })),
    products: createSeedProducts().map((product) => {
      const code = /^vr-prod-(\d+)(?:-|$)/.exec(product.id)?.[1];
      if (!code) throw new Error("Produto sem código comercial de origem reconhecido.");
      return {
        source_id: product.id,
        commercial_code: code,
        category_source_id: product.categoryId,
        name: product.name,
        description: product.description,
        price_cents: product.priceCents,
        image_url: product.imageUrl,
        available: product.available,
      };
    }),
  };
}
