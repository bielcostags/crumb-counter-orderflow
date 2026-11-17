import { act, cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createSeedCategories, createSeedProducts, createSeedStore } from "@/data/mock";
import { createSeedStore as technicalStore } from "@/test/fixtures/catalog";
import { BrandMark } from "@/components/shared/Brand";
import {
  adminSessionStore,
  cartStore,
  dataStore,
  STORE_KEY,
  parseStoreData,
} from "@/services/local/store";
import { counterCartStore } from "@/services/local/counter-store";
import { createPersistentStore } from "@/lib/persistent-store";
import { openCatalog } from "./helpers/catalog-router";
import type { StoreData } from "@/types";

beforeEach(() => {
  dataStore.set(createSeedStore());
  cartStore.reset();
  counterCartStore.reset();
  adminSessionStore.set({ signedIn: true, mode: "demo" });
});
afterEach(cleanup);
const expected = [
  ["Lanches", [2400, 1900, 2300, 1800]],
  ["Sanduíches", [1800, 1700, 1000, 500, 300, 600, 500, 700, 900, 980]],
  ["Tapiocas", [700, 900, 1500, 900, 1500, 800, 2000]],
  ["Crepiocas", [1400, 1400]],
  ["Cuscuz", [1800, 1600, 900, 1100, 1200]],
  ["Capuccinos", [200, 500, 500, 1400, 1300, 1500, 1500, 1600, 1000, 700]],
  ["Sucos", [1000, 2000, 900, 1800]],
  ["Adicionais", [300, 300, 300, 300, 300, 600, 600, 800, 1000, 800, 250, 250, 400, 300, 700]],
] as const;

describe("Catálogo comercial Vila Rica", () => {
  it("tem exatamente 8 categorias ordenadas e ativas, e 57 produtos disponíveis na demo", () => {
    const categories = createSeedCategories();
    const products = createSeedProducts();
    expect(categories.map((c) => c.name)).toEqual(expected.map(([name]) => name));
    expect(categories.map((c) => c.sortOrder)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(categories.every((c) => c.active)).toBe(true);
    expect(products).toHaveLength(57);
    expect(
      products.every((p) => p.available && categories.some((c) => c.id === p.categoryId)),
    ).toBe(true);
    expect(products.every((p) => p.imageUrl === "")).toBe(true);
  });
  it.each(expected)("confere quantidades e preços oficiais de %s", (name, prices) => {
    const category = createSeedCategories().find((c) => c.name === name)!;
    expect(
      createSeedProducts()
        .filter((p) => p.categoryId === category.id)
        .map((p) => p.priceCents),
    ).toEqual(prices);
  });
  it("usa IDs únicos novos, preserva descrições oficiais e não inventa detalhes", () => {
    const products = createSeedProducts();
    expect(new Set(products.map((p) => p.id)).size).toBe(57);
    expect(new Set(createSeedCategories().map((c) => c.id)).size).toBe(8);
    const previous = technicalStore();
    expect(products.some((p) => previous.products.some((old) => old.id === p.id))).toBe(false);
    expect(products.find((p) => p.name === "X-Bacon")?.description).toBe(
      "Hambúrguer, bacon, presunto, queijo e salada.",
    );
    expect(products.find((p) => p.name === "Pão com Queijo")?.description).toBe(
      "Duas fatias de queijo.",
    );
    expect(products.find((p) => p.name === "Tapioca com Ovo")?.description).toBe("");
    const additions = products.filter((p) => p.categoryId === "vr-cat-adicionais");
    expect(
      additions.filter((p) => p.description === "Adicional indicado para lanches."),
    ).toHaveLength(13);
    expect(
      additions.filter((p) => p.description === "Adicional indicado para sucos."),
    ).toHaveLength(2);
  });
  it("preserva os dois códigos 362 com IDs distintos e documenta a pendência", () => {
    const products = createSeedProducts();
    const chocolate = products.find((p) => p.name === "Chocolate Quente")!;
    const moca = products.find((p) => p.name === "Moça Expresso")!;
    expect(chocolate.priceCents).toBe(1300);
    expect(moca.priceCents).toBe(1000);
    expect(chocolate.id).not.toBe(moca.id);
    const docs = readFileSync("docs/catalogo-vila-rica.md", "utf8");
    expect(docs.match(/^\|\s*362\s*\|/gm)).toHaveLength(2);
    for (const product of products) expect(docs).toContain(`\`${product.id}\``);
  });
  it("mantém os exemplos fictícios consistentes com snapshots do novo catálogo", () => {
    const data = createSeedStore();
    expect(data.orders).toHaveLength(14);
    for (const order of data.orders) {
      expect(order.totalCents).toBe(
        order.items.reduce((total, item) => total + item.subtotalCents, 0),
      );
      for (const item of order.items) {
        const product = data.products.find((p) => p.id === item.productId)!;
        expect(item.name).toBe(product.name);
        expect(item.unitPriceCents).toBe(product.priceCents);
        expect(item.subtotalCents).toBe(item.unitPriceCents * item.quantity);
      }
    }
  });
  it("não substitui dados locais existentes ao carregar com o novo seed", () => {
    const old = technicalStore();
    old.products[0]!.name = "Produto cadastrado pelo usuário";
    dataStore.set(old);
    const loaded = createPersistentStore<StoreData>(
      STORE_KEY,
      createSeedStore,
      parseStoreData,
    ).get();
    expect(loaded).toEqual(old);
    expect(dataStore.get().orders).toEqual(old.orders);
  });
});

describe("Identidade e jornadas Vila Rica", () => {
  it("renderiza a logo oficial com proporções originais e identificação acessível", () => {
    render(<BrandMark />);
    expect(screen.getByText("Vila Rica")).toBeInTheDocument();
    expect(screen.getByText("Padaria e Confeitaria Artesanal")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Vila Rica — Padaria e Confeitaria Artesanal" }),
    ).toHaveAttribute("src", "/images/brand/logo.jpeg");
    expect(screen.getByRole("img")).toHaveAttribute("width", "1600");
    expect(screen.getByRole("img")).toHaveAttribute("height", "1333");
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByText("Vila Rica")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
  it("integra produto comercial ao carrinho e ao checkout online", async () => {
    const router = await openCatalog("/");
    expect(await screen.findByRole("link", { name: "Vila Rica — cardápio" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar X-Bacon ao carrinho" }));
    await act(async () => {
      await router.navigate({ to: "/carrinho" });
    });
    expect(await screen.findByText("X-Bacon")).toBeInTheDocument();
    await act(async () => {
      await router.navigate({ to: "/checkout" });
    });
    fireEvent.change(await screen.findByLabelText(/Nome do cliente/), {
      target: { value: "Cliente Exemplo" },
    });
    fireEvent.change(screen.getByLabelText(/Telefone com DDD/), {
      target: { value: "00900000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido demonstrativo" }));
    await screen.findByText("Pedido registrado com sucesso!");
    expect(dataStore.get().orders[0]?.items[0]).toMatchObject({
      name: "X-Bacon",
      unitPriceCents: 2400,
    });
    expect(dataStore.get().orders[0]?.totalCents).toBe(2400);
  });
  it("integra catálogo ao PDV e preserva nome Vila Rica no comprovante não fiscal", async () => {
    await openCatalog("/admin/balcao");
    fireEvent.click(
      await screen.findByRole("button", { name: "Adicionar Cafezinho ao pedido de balcão" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Finalizar pedido de balcão" }));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Registrar venda demonstrativa",
      }),
    );
    await screen.findByText("Venda registrada com sucesso!");
    const receipt = screen.getByRole("region", { name: "Comprovante demonstrativo" });
    expect(receipt).toHaveTextContent("Vila Rica");
    expect(receipt).toHaveTextContent("COMPROVANTE DEMONSTRATIVO — SEM VALOR FISCAL");
    await waitFor(() => expect(dataStore.get().orders[0]?.totalCents).toBe(200));
  });
});
