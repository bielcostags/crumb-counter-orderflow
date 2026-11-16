import { act, cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { openCatalog } from "./helpers/catalog-router";
import { adminSessionStore, cartStore, dataStore } from "@/services/local/store";
import { localServices } from "@/services/local";
import { ProductImage } from "@/components/shared/ProductImage";
import { formatBRL } from "@/lib/format";

beforeEach(() => {
  dataStore.reset();
  cartStore.reset();
  adminSessionStore.set({ signedIn: true, mode: "demo" });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const money = (cents: number) => formatBRL(cents).replace(/\s/g, " ");
async function newProduct() {
  fireEvent.click(await screen.findByRole("button", { name: "Novo produto" }));
  return screen.findByRole("dialog");
}
function fillProduct(dialog: HTMLElement, name = "Produto Teste") {
  fireEvent.change(within(dialog).getByLabelText(/Nome do produto/), { target: { value: name } });
  fireEvent.change(within(dialog).getByLabelText(/Preço de venda/), { target: { value: "2,50" } });
}
async function saveProduct(dialog: HTMLElement) {
  fireEvent.click(within(dialog).getByRole("button", { name: "Salvar produto" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}

describe("Gestão administrativa do cardápio", () => {
  it.each(["/admin/produtos", "/admin/categorias"])(
    "protege a rota %s sem sessão",
    async (path) => {
      adminSessionStore.reset();
      const router = await openCatalog(path);
      await screen.findByRole("heading", { name: "Acesso da equipe" });
      expect(router.state.location.pathname).toBe("/admin/acesso");
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    },
  );
  it("navega entre os módulos com o menu administrativo", async () => {
    await openCatalog();
    fireEvent.click(await screen.findByRole("link", { name: "Categorias" }));
    await screen.findByRole("heading", { name: "Categorias", level: 1 });
    fireEvent.click(screen.getByRole("link", { name: "Produtos" }));
    await screen.findByRole("heading", { name: "Produtos", level: 1 });
    expect(screen.getByRole("link", { name: "Atendimento no balcão" })).toBeInTheDocument();
  });
  it("cadastra produto e mostra no cardápio público", async () => {
    const router = await openCatalog();
    const dialog = await newProduct();
    fillProduct(dialog);
    fireEvent.change(within(dialog).getByLabelText("Descrição"), {
      target: { value: "Descrição demonstrativa" },
    });
    fireEvent.change(within(dialog).getByLabelText("Imagem do projeto"), {
      target: { value: "/images/products/pao-frances.jpg" },
    });
    await saveProduct(dialog);
    expect(dataStore.get().products.find((p) => p.name === "Produto Teste")).toMatchObject({
      priceCents: 250,
      available: true,
    });
    await act(async () => {
      await router.navigate({ to: "/" });
    });
    const card = await screen.findByRole("article", { name: "Produto Teste" });
    expect(card).toHaveTextContent(money(250));
    expect(within(card).getByRole("button", { name: /Adicionar Produto Teste/ })).toBeEnabled();
  });
  it("valida campos e imagem inválidos antes do serviço", async () => {
    const spy = vi.spyOn(localServices.catalog, "saveProduct");
    await openCatalog();
    const dialog = await newProduct();
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar produto" }));
    expect(within(dialog).getByText(/Informe um nome/)).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    fillProduct(dialog);
    fireEvent.change(within(dialog).getByLabelText(/Preço de venda/), { target: { value: "-1" } });
    fireEvent.change(within(dialog).getByLabelText("Imagem local ou URL HTTPS"), {
      target: { value: "javascript:alert(1)" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar produto" }));
    expect(within(dialog).getByText(/URL HTTPS válida/)).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("img", { name: /imagem indisponível/ })).toBeInTheDocument();
  });
  it("edita os dados atuais mantendo ID e confirma descarte de alterações", async () => {
    await openCatalog();
    fireEvent.click(await screen.findByRole("button", { name: "Editar produto Pão francês" }));
    let dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/Preço de venda/)).toHaveValue("1,20");
    fireEvent.change(within(dialog).getByLabelText(/Nome do produto/), {
      target: { value: "Rascunho" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    const confirmation = await screen.findByRole("alertdialog");
    fireEvent.click(within(confirmation).getByRole("button", { name: "Descartar alterações" }));
    expect(dataStore.get().products[0]?.name).toBe("Pão francês");
    fireEvent.click(screen.getByRole("button", { name: "Editar produto Pão francês" }));
    dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Nome do produto/), {
      target: { value: "Pão atualizado" },
    });
    fireEvent.change(within(dialog).getByLabelText(/Preço de venda/), {
      target: { value: "1,50" },
    });
    await saveProduct(dialog);
    expect(dataStore.get().products.find((p) => p.id === "p-pao-frances")).toMatchObject({
      name: "Pão atualizado",
      priceCents: 150,
    });
  });
  it("pesquisa, filtra e ordena produtos", async () => {
    await openCatalog();
    const search = await screen.findByLabelText("Pesquisar nome ou descrição");
    fireEvent.change(search, { target: { value: "casca crocante" } });
    expect(screen.getByText("1 produto(s) encontrado(s)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    fireEvent.change(screen.getByLabelText("Categoria"), { target: { value: "cat-paes" } });
    fireEvent.change(screen.getByLabelText("Disponibilidade"), {
      target: { value: "unavailable" },
    });
    expect(screen.getByText("1 produto(s) encontrado(s)")).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveTextContent("Pão integral com grãos");
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    fireEvent.change(screen.getByLabelText("Ordenar produtos"), {
      target: { value: "price-desc" },
    });
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Bolo de chocolate");
    fireEvent.change(screen.getByLabelText("Ordenar produtos"), { target: { value: "price-asc" } });
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Pão francês");
    fireEvent.change(search, { target: { value: "inexistente" } });
    expect(screen.getByText("Nenhum produto encontrado")).toBeInTheDocument();
  });
  it("alterna disponibilidade sem duplicar operação", async () => {
    const spy = vi.spyOn(localServices.catalog, "setProductAvailable");
    await openCatalog();
    const button = await screen.findByRole("button", { name: "Indisponibilizar Pão francês" });
    fireEvent.click(button);
    fireEvent.click(button);
    await screen.findByRole("button", { name: "Disponibilizar Pão francês" });
    expect(spy).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Disponibilizar Pão francês" }));
    await screen.findByRole("button", { name: "Indisponibilizar Pão francês" });
    expect(dataStore.get().products[0]?.available).toBe(true);
  });
  it("trata falha, preserva formulário e bloqueia salvamentos duplicados", async () => {
    const spy = vi
      .spyOn(localServices.catalog, "saveProduct")
      .mockRejectedValueOnce(new Error("Falha simulada"));
    await openCatalog();
    const dialog = await newProduct();
    fillProduct(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar produto" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Falha simulada");
    expect(within(dialog).getByLabelText(/Nome do produto/)).toHaveValue("Produto Teste");
    const form = within(dialog).getByRole("button", { name: "Salvar produto" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(spy).toHaveBeenCalledTimes(2);
    expect(dataStore.get().products.filter((p) => p.name === "Produto Teste")).toHaveLength(1);
  });
  it("orienta quando não há categorias ativas e permite editar na categoria inativa atual", async () => {
    await act(async () => {
      for (const category of dataStore.get().categories)
        await localServices.catalog.setCategoryActive(category.id, false);
    });
    await openCatalog();
    expect(await screen.findByRole("button", { name: "Novo produto" })).toBeDisabled();
    expect(screen.getByText(/Cadastre ou reative uma categoria/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Editar produto Pão francês" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/categoria inativa. Pode mantê-la/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Preço de venda/), {
      target: { value: "1,50" },
    });
    await saveProduct(dialog);
    expect(dataStore.get().products[0]?.priceCents).toBe(150);
  });
  it("cadastra e edita categoria, informa duplicatas e permite filtros", async () => {
    await openCatalog("/admin/categorias");
    fireEvent.click(await screen.findByRole("button", { name: "Nova categoria" }));
    let dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Nome da categoria/), {
      target: { value: "Pães" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar categoria" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Já existe");
    fireEvent.change(within(dialog).getByLabelText(/Nome da categoria/), {
      target: { value: "  Doces   Especiais  " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar categoria" }));
    await screen.findByRole("button", { name: "Editar categoria Doces Especiais" });
    fireEvent.click(screen.getByRole("button", { name: "Editar categoria Doces Especiais" }));
    dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Nome da categoria/), {
      target: { value: "Doces" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar categoria" }));
    await screen.findByRole("button", { name: "Editar categoria Doces" });
    fireEvent.change(screen.getByLabelText("Pesquisar categoria"), { target: { value: "doces" } });
    expect(screen.getByText("1 categoria(s) encontrada(s)")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Situação"), { target: { value: "inactive" } });
    expect(screen.getByText("Nenhuma categoria encontrada")).toBeInTheDocument();
  });
  it("desativa com confirmação e reativa sem alterar disponibilidade individual ou histórico", async () => {
    const products = dataStore.get().products;
    const orders = dataStore.get().orders;
    const router = await openCatalog("/admin/categorias");
    fireEvent.click(await screen.findByRole("button", { name: "Desativar categoria Pães" }));
    let confirm = await screen.findByRole("alertdialog");
    expect(confirm).toHaveTextContent("3 produto(s)");
    fireEvent.click(within(confirm).getByRole("button", { name: "Voltar" }));
    expect(dataStore.get().categories[0]?.active).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Desativar categoria Pães" }));
    confirm = await screen.findByRole("alertdialog");
    fireEvent.click(within(confirm).getByRole("button", { name: "Confirmar desativação" }));
    await screen.findByRole("button", { name: "Ativar categoria Pães" });
    await act(async () => {
      await router.navigate({ to: "/" });
    });
    expect(screen.queryByRole("article", { name: "Pão francês" })).not.toBeInTheDocument();
    await act(async () => {
      await router.navigate({ to: "/admin/categorias" });
    });
    fireEvent.click(await screen.findByRole("button", { name: "Ativar categoria Pães" }));
    await screen.findByRole("button", { name: "Desativar categoria Pães" });
    expect(dataStore.get().products).toEqual(products);
    expect(dataStore.get().orders).toEqual(orders);
    await act(async () => {
      await router.navigate({ to: "/" });
    });
    expect(await screen.findByRole("article", { name: "Pão francês" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("article", { name: "Pão integral com grãos" })).getByRole("button"),
    ).toBeDisabled();
  });
  it("exige confirmação também ao desativar pela edição", async () => {
    await openCatalog("/admin/categorias");
    fireEvent.click(await screen.findByRole("button", { name: "Editar categoria Pães" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Categoria ativa" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar categoria" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(dataStore.get().categories[0]?.active).toBe(true);
    fireEvent.click(within(confirm).getByRole("button", { name: "Confirmar desativação" }));
    await waitFor(() => expect(dataStore.get().categories[0]?.active).toBe(false));
  });
});

describe("Carrinho, confirmação e imagens", () => {
  it("não aceita silenciosamente uma mudança ao inicializar preços de itens legados", async () => {
    cartStore.set([
      { productId: "p-pao-frances", quantity: 1, reviewedPriceCents: 100 },
      { productId: "p-cafe", quantity: 1 },
    ]);
    await openCatalog("/checkout");
    expect(await screen.findByText("O preço de itens do carrinho mudou")).toBeInTheDocument();
    await waitFor(() => expect(cartStore.get()[1]?.reviewedPriceCents).toBe(550));
    expect(cartStore.get()[0]?.reviewedPriceCents).toBe(100);
    expect(screen.getByRole("button", { name: "Confirmar pedido demonstrativo" })).toBeDisabled();
  });
  it("reflete edição e indisponibilidade reativamente no cardápio já aberto", async () => {
    await openCatalog("/");
    await screen.findByRole("article", { name: "Pão francês" });
    const product = dataStore.get().products[0]!;
    await act(async () => {
      await localServices.catalog.saveProduct(
        { ...product, name: "Pão novo", priceCents: 150 },
        product.id,
      );
    });
    const card = await screen.findByRole("article", { name: "Pão novo" });
    expect(card).toHaveTextContent(money(150));
    await act(async () => {
      await localServices.catalog.setProductAvailable(product.id, false);
    });
    expect(within(card).getByRole("button")).toBeDisabled();
    await act(async () => {
      await localServices.catalog.setCategoryActive(product.categoryId, false);
    });
    expect(screen.queryByRole("article", { name: "Pão novo" })).not.toBeInTheDocument();
  });

  it("atualiza preço no carrinho, exige revisão no checkout e bloqueia item indisponível", async () => {
    const router = await openCatalog("/");
    fireEvent.click(
      await screen.findByRole("button", { name: "Adicionar Pão francês ao carrinho" }),
    );
    await act(async () => {
      await router.navigate({ to: "/carrinho" });
    });
    const product = dataStore.get().products[0]!;
    await act(async () => {
      await localServices.catalog.saveProduct({ ...product, priceCents: 150 }, product.id);
    });
    expect(await screen.findByText("O preço de itens do carrinho mudou")).toBeInTheDocument();
    expect(screen.getByText(/para R\$/)).toHaveTextContent(money(150));
    await act(async () => {
      await router.navigate({ to: "/checkout" });
    });
    expect(
      await screen.findByRole("button", { name: "Confirmar pedido demonstrativo" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Revisei os preços atualizados" }));
    expect(screen.getByRole("button", { name: "Confirmar pedido demonstrativo" })).toBeEnabled();
    await act(async () => {
      await localServices.catalog.setProductAvailable(product.id, false);
    });
    expect(screen.getByRole("button", { name: "Confirmar pedido demonstrativo" })).toBeDisabled();
    expect(screen.getByText(/está indisponível/)).toBeInTheDocument();
    await act(async () => {
      await router.navigate({ to: "/carrinho" });
    });
    expect(screen.getByText(/Indisponível: remova/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remover item" }));
    expect(screen.getByText("Seu carrinho está vazio")).toBeInTheDocument();
  });
  it("impede valor silenciosamente alterado durante o envio e permite revisar e tentar novamente", async () => {
    cartStore.set([{ productId: "p-pao-frances", quantity: 1, reviewedPriceCents: 120 }]);
    await openCatalog("/checkout");
    fireEvent.change(await screen.findByLabelText(/Nome do cliente/), {
      target: { value: "Cliente Exemplo" },
    });
    fireEvent.change(screen.getByLabelText(/Telefone com DDD/), {
      target: { value: "00900000000" },
    });
    // Inicia a mudança primeiro: o serviço aplica o preço durante a latência da confirmação.
    const product = dataStore.get().products[0]!;
    const update = localServices.catalog.saveProduct({ ...product, priceCents: 150 }, product.id);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido demonstrativo" }));
    await act(async () => {
      await update;
    });
    await screen.findByText(/O cardápio mudou durante a confirmação/);
    expect(cartStore.get()).toHaveLength(1);
    expect(dataStore.get().orders).toHaveLength(14);
    fireEvent.click(screen.getByRole("button", { name: "Revisei os preços atualizados" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido demonstrativo" }));
    await screen.findByText("Pedido registrado com sucesso!");
    expect(dataStore.get().orders[0]?.totalCents).toBe(150);
  });
  it("usa fallback para imagem inválida e recupera a prévia após falha", () => {
    const view = render(<ProductImage src="javascript:alert(1)" alt="Pão Exemplo" />);
    expect(
      screen.getByRole("img", { name: "Pão Exemplo (imagem indisponível)" }),
    ).toBeInTheDocument();
    view.rerender(<ProductImage src="https://example.com/failed.jpg" alt="Pão Exemplo" />);
    fireEvent.error(screen.getByRole("img", { name: "Pão Exemplo" }));
    expect(screen.getByRole("img", { name: /imagem indisponível/ })).toBeInTheDocument();
    view.rerender(<ProductImage src="/images/products/pao-frances.jpg" alt="Pão Exemplo" />);
    expect(screen.getByRole("img", { name: "Pão Exemplo" })).toHaveAttribute(
      "src",
      "/images/products/pao-frances.jpg",
    );
  });
});
