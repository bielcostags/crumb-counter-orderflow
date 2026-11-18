import { adminSessionStore } from "@/services/local/store";
import { demoAdminSession } from "@/test/helpers/demo-session";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { localServices } from "@/services/local";
import { dataStore, cartStore, STORE_KEY, parseStoreData } from "@/services/local/store";
import { createPersistentStore } from "@/lib/persistent-store";
import { createSeedStore } from "@/test/fixtures/catalog";
import { isValidProductImage } from "@/lib/catalog";
import { buildOrderItems } from "@/lib/orders";
import type { StoreData } from "@/types";

const input = {
  name: "Pão Exemplo",
  description: "Receita fictícia",
  priceCents: 150,
  categoryId: "cat-paes",
  imageUrl: "",
  available: true,
};
const checkout = {
  customerName: "Cliente Exemplo",
  customerPhone: "00900000000",
  fulfillment: "retirada" as const,
  paymentMethod: "pix" as const,
};
const lines = [{ productId: "p-pao-frances", quantity: 2 }];
async function complete<T>(operation: Promise<T>) {
  const result = operation.then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  await vi.runAllTimersAsync();
  const settled = await result;
  if ("error" in settled) throw settled.error;
  return settled.value;
}
beforeEach(() => {
  adminSessionStore.set(demoAdminSession);
  vi.useFakeTimers();
  dataStore.set(createSeedStore(new Date()));
  cartStore.reset();
});
afterEach(() => vi.useRealTimers());

describe("Serviços de catálogo", () => {
  it("cadastra, lista e edita produto preservando o ID", async () => {
    const product = await complete(
      localServices.catalog.saveProduct({ ...input, name: "  Pão   Exemplo  " }),
    );
    expect(product).toMatchObject({ name: "Pão Exemplo", priceCents: 150 });
    expect(await complete(localServices.catalog.listProducts())).toContainEqual(product);
    const edited = await complete(
      localServices.catalog.saveProduct(
        { ...input, name: "Novo nome", priceCents: 200 },
        product.id,
      ),
    );
    expect(edited.id).toBe(product.id);
    expect(dataStore.get().products.find((p) => p.id === product.id)?.priceCents).toBe(200);
  });
  it.each([0, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejeita preço inválido %s sem mutação",
    async (priceCents) => {
      const before = dataStore.get();
      await expect(
        complete(localServices.catalog.saveProduct({ ...input, priceCents })),
      ).rejects.toThrow();
      expect(dataStore.get()).toBe(before);
    },
  );
  it("rejeita nome obrigatório e categoria inexistente", async () => {
    await expect(
      complete(localServices.catalog.saveProduct({ ...input, name: " " })),
    ).rejects.toThrow();
    await expect(
      complete(localServices.catalog.saveProduct({ ...input, categoryId: "missing" })),
    ).rejects.toThrow();
  });
  it("proíbe criação e transferência para categoria inativa, mas permite manter a atual", async () => {
    await complete(localServices.catalog.setCategoryActive("cat-paes", false));
    await expect(complete(localServices.catalog.saveProduct(input))).rejects.toThrow("ativa");
    const current = dataStore.get().products.find((p) => p.id === "p-pao-frances")!;
    expect(
      (
        await complete(
          localServices.catalog.saveProduct({ ...current, priceCents: 150 }, current.id),
        )
      ).id,
    ).toBe(current.id);
    const other = dataStore.get().products.find((p) => p.id === "p-cafe")!;
    await expect(
      complete(localServices.catalog.saveProduct({ ...other, categoryId: "cat-paes" }, other.id)),
    ).rejects.toThrow("ativa");
    await complete(
      localServices.catalog.saveProduct({ ...current, categoryId: "cat-bolos" }, current.id),
    );
    expect(dataStore.get().products.find((p) => p.id === current.id)?.categoryId).toBe("cat-bolos");
  });
  it("alterna disponibilidade e bloqueia novos pedidos", async () => {
    await complete(localServices.catalog.setProductAvailable("p-pao-frances", false));
    await expect(complete(localServices.orders.createOnlineOrder(checkout, lines))).rejects.toThrow(
      "indisponível",
    );
    await complete(localServices.catalog.setProductAvailable("p-pao-frances", true));
    expect(
      (await complete(localServices.orders.createOnlineOrder(checkout, lines))).totalCents,
    ).toBe(240);
  });
  it("normaliza e edita categorias, rejeita duplicatas e preserva ordenação", async () => {
    const category = await complete(
      localServices.catalog.saveCategory({ name: "  Doces   Especiais ", active: true }),
    );
    expect(category.name).toBe("Doces Especiais");
    expect(category.sortOrder).toBe(5);
    await expect(
      complete(localServices.catalog.saveCategory({ name: " doces especiais ", active: true })),
    ).rejects.toThrow("Já existe");
    await expect(
      complete(localServices.catalog.saveCategory({ name: "  ", active: true })),
    ).rejects.toThrow();
    const edited = await complete(
      localServices.catalog.saveCategory(
        { name: "Doces", description: "  Exemplo  ", active: true },
        category.id,
      ),
    );
    expect(edited).toMatchObject({ id: category.id, sortOrder: 5, description: "Exemplo" });
    expect(await complete(localServices.catalog.listCategories())).toContainEqual(edited);
  });
  it("desativa e reativa categoria sem alterar produtos ou pedidos históricos", async () => {
    const before = dataStore.get();
    await complete(localServices.catalog.setCategoryActive("cat-paes", false));
    await expect(complete(localServices.orders.createOnlineOrder(checkout, lines))).rejects.toThrow(
      "indisponível",
    );
    await complete(localServices.catalog.setCategoryActive("cat-paes", true));
    expect(dataStore.get().products).toEqual(before.products);
    expect(dataStore.get().orders).toEqual(before.orders);
    expect(dataStore.get().products.find((p) => p.id === "p-pao-integral")?.available).toBe(false);
  });
  it("preserva snapshots históricos e usa preço e nome atuais nas novas compras", async () => {
    const previous = await complete(localServices.orders.createOnlineOrder(checkout, lines));
    const product = dataStore.get().products.find((p) => p.id === "p-pao-frances")!;
    await complete(
      localServices.catalog.saveProduct(
        {
          ...product,
          name: "Novo pão",
          priceCents: 150,
          imageUrl: "https://example.com/pao.jpg",
          categoryId: "cat-bolos",
        },
        product.id,
      ),
    );
    const next = await complete(localServices.orders.createOnlineOrder(checkout, lines));
    expect(dataStore.get().orders.find((o) => o.id === previous.id)).toEqual(previous);
    expect(previous.items[0]).toMatchObject({ name: "Pão francês", unitPriceCents: 120 });
    expect(next.items[0]).toMatchObject({ name: "Novo pão", unitPriceCents: 150 });
    expect(next.totalCents).toBe(300);
  });
  it("rejeita alteração de preço durante o registro com prévia confirmada", async () => {
    const data = dataStore.get();
    const quote = buildOrderItems(lines, data.products, data.categories);
    cartStore.set(lines);
    const product = data.products.find((p) => p.id === lines[0]!.productId)!;
    await complete(localServices.catalog.saveProduct({ ...product, priceCents: 150 }, product.id));
    const before = dataStore.get();
    await expect(
      complete(localServices.orders.createOnlineOrder(checkout, lines, quote)),
    ).rejects.toThrow("cardápio mudou");
    expect(dataStore.get()).toBe(before);
    expect(cartStore.get()).toEqual(lines);
  });
  it("persiste dados para uma nova instância do armazenamento", async () => {
    const product = await complete(localServices.catalog.saveProduct(input));
    // Nova instância reproduz a leitura de uma nova sessão; testa dados realmente gravados.
    const reloaded = createPersistentStore<StoreData>(STORE_KEY, createSeedStore, parseStoreData);
    expect(reloaded.get().products).toContainEqual(product);
  });
  it.each([
    "http://example.com/a.jpg",
    "javascript:alert(1)",
    "data:image/png;base64,abc",
    "//example.com/a.jpg",
    "https://user:pass@example.com/a.jpg",
    "inválida",
  ])("rejeita imagem %s", async (imageUrl) => {
    expect(isValidProductImage(imageUrl)).toBe(false);
    await expect(
      complete(localServices.catalog.saveProduct({ ...input, imageUrl })),
    ).rejects.toThrow("HTTPS");
  });
  it.each(["", "/images/products/pao-frances.jpg", "https://example.com/a.jpg"])(
    "aceita imagem %s",
    async (imageUrl) => {
      expect(
        (await complete(localServices.catalog.saveProduct({ ...input, imageUrl }))).imageUrl,
      ).toBe(imageUrl);
    },
  );
});
