import { describe, expect, it, vi } from "vitest";
import { parseBackendPlan } from "@/services/backend/config";
import { createCatalogImportManifest } from "@/services/backend/catalog-manifest";
import { createSeedCategories, createSeedProducts } from "@/data/mock";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const valid = {
  VITE_BACKEND_MODE: "supabase",
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abcdefghijklmnopqrstuvwxyz",
};
describe("preparação isolada de backend", () => {
  it("mantém modo local por padrão sem credenciais", () =>
    expect(parseBackendPlan({})).toEqual({ mode: "local" }));
  it("valida configuração remota sem criar conexão", () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    expect(parseBackendPlan(valid)).toEqual({
      mode: "supabase",
      url: valid.VITE_SUPABASE_URL,
      publishableKey: valid.VITE_SUPABASE_PUBLISHABLE_KEY,
    });
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
  });
  it("não converte modo inválido em local", () =>
    expect(() => parseBackendPlan({ VITE_BACKEND_MODE: "invalid" })).toThrow());
  it("não converte configuração remota ausente em local", () =>
    expect(() => parseBackendPlan({ VITE_BACKEND_MODE: "supabase" })).toThrow());
  it.each([
    "http://example.com",
    "https://user:password@example.com",
    "https://example.com?secret=x",
    "invalid",
  ])("rejeita URL insegura %s", (url) =>
    expect(() => parseBackendPlan({ ...valid, VITE_SUPABASE_URL: url })).toThrow(),
  );
  it.each(["sb_secret_abcdefghijklmnopqrst", "eyJservice_role", "", "service_role"])(
    "rejeita chave não pública %s",
    (key) =>
      expect(() => parseBackendPlan({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: key })).toThrow(),
  );
  it("não inclui credenciais no erro", () => {
    expect(() =>
      parseBackendPlan({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: "secret-value" }),
    ).toThrow("Configuração pública do Supabase ausente ou inválida.");
  });
});
describe("manifesto de catálogo para revisão", () => {
  it("exporta exatamente 8 categorias e 57 produtos, sem pedidos nem dados pessoais", () => {
    const manifest = createCatalogImportManifest();
    expect(Object.keys(manifest)).toEqual(["source", "categories", "products"]);
    expect(manifest.categories).toHaveLength(8);
    expect(manifest.products).toHaveLength(57);
    expect(new Set(manifest.products.map((p) => p.source_id)).size).toBe(57);
  });
  it("preserva todos os campos comerciais e relacionamentos", () => {
    const manifest = createCatalogImportManifest();
    for (const p of createSeedProducts()) {
      expect(manifest.products.find((row) => row.source_id === p.id)).toMatchObject({
        name: p.name,
        description: p.description,
        price_cents: p.priceCents,
        image_url: p.imageUrl,
        category_source_id: p.categoryId,
        available: p.available,
      });
      expect(manifest.categories.some((c) => c.source_id === p.categoryId)).toBe(true);
    }
    expect(manifest.categories.map((c) => c.source_id)).toEqual(
      createSeedCategories().map((c) => c.id),
    );
  });
  it("preserva o código 362 duplicado em dois produtos distintos", () => {
    const rows = createCatalogImportManifest().products.filter((p) => p.commercial_code === "362");
    expect(rows).toHaveLength(2);
    expect(rows.map((p) => p.price_cents)).toEqual([1300, 1000]);
    expect(new Set(rows.map((p) => p.source_id)).size).toBe(2);
  });
  it("produz conteúdo determinístico sem alterar persistência", () => {
    const before = { ...localStorage };
    expect(createCatalogImportManifest()).toEqual(createCatalogImportManifest());
    expect({ ...localStorage }).toEqual(before);
  });
  it("preserva caminhos de imagens existentes", () => {
    for (const p of createCatalogImportManifest().products)
      expect(existsSync(resolve("public", p.image_url.slice(1)))).toBe(true);
  });
});
