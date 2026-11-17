import { cleanup, screen, within, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { CATALOG_PRODUCT_IMAGES } from "@/data/catalog-product-images";
import { createSeedStore, createSeedProducts, PRODUCT_IMAGE_GALLERY } from "@/data/mock";
import { fillMissingCatalogImages } from "@/lib/fill-catalog-images";
import { isValidProductImage } from "@/lib/catalog";
import {
  dataStore,
  cartStore,
  adminSessionStore,
  STORE_KEY,
  parseStoreData,
} from "@/services/local/store";
import { createPersistentStore } from "@/lib/persistent-store";
import { counterCartStore } from "@/services/local/counter-store";
import { openCatalog } from "./helpers/catalog-router";

beforeEach(() => {
  dataStore.set(createSeedStore());
  cartStore.reset();
  counterCartStore.reset();
  adminSessionStore.set({ signedIn: true, mode: "demo" });
});
afterEach(cleanup);

describe("Imagens individuais do catálogo", () => {
  it("associa uma imagem física WebP distinta a cada um dos 57 produtos", () => {
    const products = createSeedProducts();
    expect(CATALOG_PRODUCT_IMAGES).toHaveLength(57);
    expect(new Set(products.map((p) => p.imageUrl)).size).toBe(57);
    for (const product of products) {
      const reference = CATALOG_PRODUCT_IMAGES.find((image) => image.productId === product.id)!;
      expect(reference).toMatchObject({
        name: product.name,
        categoryId: product.categoryId,
        url: product.imageUrl,
      });
      expect(product.imageUrl).toMatch(/^\/images\/products\/[a-z]+\/[a-z0-9-]+\.webp$/);
      const file = resolve("public", product.imageUrl.slice(1));
      expect(existsSync(file)).toBe(true);
      expect(statSync(file).size).toBeLessThanOrEqual(150 * 1024);
      const header = readFileSync(file);
      expect(header.subarray(0, 4).toString()).toBe("RIFF");
      expect(header.subarray(8, 12).toString()).toBe("WEBP");
      expect(header.subarray(12, 16).toString()).toBe("VP8 ");
      expect(header.readUInt16LE(26) & 0x3fff).toBe(800);
      expect(header.readUInt16LE(28) & 0x3fff).toBe(800);
      expect(PRODUCT_IMAGE_GALLERY.some((image) => image.url === product.imageUrl)).toBe(true);
      expect(isValidProductImage(product.imageUrl)).toBe(true);
    }
  });
  it("preenche somente imagens ausentes e preserva preços, disponibilidade, categorias e histórico", () => {
    const data = createSeedStore();
    data.products = data.products.map((p) => ({ ...p, imageUrl: "" }));
    const before = structuredClone(data);
    const updated = fillMissingCatalogImages(data, CATALOG_PRODUCT_IMAGES);
    expect(updated).not.toBe(data);
    expect(updated.orders).toBe(data.orders);
    expect(updated.categories).toBe(data.categories);
    expect(updated.products).toHaveLength(57);
    updated.products.forEach((p, index) => {
      expect({ ...p, imageUrl: "" }).toEqual(before.products[index]);
      expect(p.imageUrl).toBe(CATALOG_PRODUCT_IMAGES.find((i) => i.productId === p.id)?.url);
    });
    expect(data).toEqual(before);
    expect(fillMissingCatalogImages(updated, CATALOG_PRODUCT_IMAGES)).toBe(updated);
  });
  it("não sobrescreve imagens customizadas nem produtos renomeados ou transferidos", () => {
    const data = createSeedStore();
    data.products[0]!.imageUrl = "https://example.com/foto-propria.jpg";
    data.products[1] = { ...data.products[1]!, imageUrl: "", name: "Produto personalizado" };
    data.products[2] = { ...data.products[2]!, imageUrl: "", categoryId: "categoria-customizada" };
    const updated = fillMissingCatalogImages(data, CATALOG_PRODUCT_IMAGES);
    expect(updated).toBe(data);
  });
  it("persiste o preenchimento pelo mecanismo existente ao montar a aplicação", async () => {
    const data = createSeedStore();
    data.products[0]!.imageUrl = "";
    const orders = data.orders;
    dataStore.set(data);
    await openCatalog("/admin/produtos");
    await waitFor(() => expect(dataStore.get().products[0]?.imageUrl).not.toBe(""));
    const restored = createPersistentStore(STORE_KEY, createSeedStore, parseStoreData).get();
    expect(restored.products[0]?.imageUrl).toBe(CATALOG_PRODUCT_IMAGES[0]?.url);
    expect(restored.orders).toEqual(orders);
  });
  it.each(["public", "admin", "pos"])("apresenta a imagem no módulo %s", async (module) => {
    const route =
      module === "public" ? "/" : module === "admin" ? "/admin/produtos" : "/admin/balcao";
    await openCatalog(route);
    const context =
      module === "public"
        ? await screen.findByRole("article", { name: "X-Bacon" })
        : module === "pos"
          ? await screen.findByRole("article", { name: "Balcão: X-Bacon" })
          : await screen.findByRole("table");
    expect(within(context).getByRole("img", { name: "X-Bacon" })).toHaveAttribute(
      "src",
      CATALOG_PRODUCT_IMAGES[0]?.url,
    );
  });
});
