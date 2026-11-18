import { demoAdminSession, fillDemoLogin } from "@/test/helpers/demo-session";
import { createSeedStore as createTechnicalStore } from "@/test/fixtures/catalog";
import { act, cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { openCatalog } from "./helpers/catalog-router";
import { adminSessionStore, cartStore, dataStore } from "@/services/local/store";
import { counterCartStore } from "@/services/local/counter-store";
import { localServices } from "@/services/local";
import { CounterCartProvider } from "@/contexts/CounterCartContext";
import { useCounterCart } from "@/contexts/counter-cart";
import { computeDayMetrics } from "@/lib/orders";
import { formatBRL } from "@/lib/format";

beforeEach(() => {
  dataStore.set(createTechnicalStore(new Date()));
  cartStore.reset();
  counterCartStore.reset();
  adminSessionStore.set(demoAdminSession);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [{ target, contentRect: { width: 900, height: 256 } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const money = (cents: number) => formatBRL(cents).replace(/\s/g, " ");
async function addBread() {
  fireEvent.click(
    await screen.findByRole("button", { name: "Adicionar Pão francês ao pedido de balcão" }),
  );
}
async function checkout() {
  fireEvent.click(screen.getByRole("button", { name: "Finalizar pedido de balcão" }));
  return screen.findByRole("dialog");
}
async function register(dialog: HTMLElement) {
  fireEvent.click(within(dialog).getByRole("button", { name: "Registrar venda" }));
  await screen.findByRole("heading", { name: "Venda registrada com sucesso!" });
}

describe("PDV: navegação e seleção", () => {
  it("protege a rota e disponibiliza o link no menu", async () => {
    adminSessionStore.reset();
    const router = await openCatalog("/admin/balcao");
    await screen.findByRole("heading", { name: "Acesso da equipe" });
    expect(router.state.location.pathname).toBe("/admin/acesso");
    await act(async () => {
      adminSessionStore.set(demoAdminSession);
      await router.navigate({ to: "/admin/produtos" });
    });
    fireEvent.click(await screen.findByRole("link", { name: "Atendimento no balcão" }));
    await screen.findByRole("heading", { name: "Atendimento no balcão", level: 1 });
    expect(router.state.location.pathname).toBe("/admin/balcao");
  });
  it("mostra estado vazio, pesquisa nome/descrição e filtra categorias ativas", async () => {
    await openCatalog("/admin/balcao");
    expect(
      await screen.findByRole("button", { name: "Finalizar pedido de balcão" }),
    ).toBeDisabled();
    const query = screen.getByLabelText("Pesquisar produto no balcão");
    fireEvent.change(query, { target: { value: "casca crocante" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.change(query, { target: { value: "inexistente" } });
    expect(screen.getByText(/Nenhum produto encontrado/)).toBeInTheDocument();
    fireEvent.change(query, { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Categoria do balcão"), {
      target: { value: "cat-bebidas" },
    });
    expect(screen.getAllByRole("article")).toHaveLength(3);
    await act(async () => {
      await localServices.catalog.setCategoryActive("cat-bebidas", false);
    });
    expect(screen.queryByRole("option", { name: "Bebidas" })).not.toBeInTheDocument();
  });
  it("consolida itens, ajusta quantidades, registra observações e remove", async () => {
    await openCatalog("/admin/balcao");
    await addBread();
    await addBread();
    expect(counterCartStore.get().lines).toHaveLength(1);
    expect(counterCartStore.get().lines[0]?.quantity).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "Aumentar quantidade de Pão francês" }));
    fireEvent.click(screen.getByRole("button", { name: "Diminuir quantidade de Pão francês" }));
    fireEvent.change(screen.getByLabelText("Observação de Pão francês"), {
      target: { value: "Separar embalagens" },
    });
    expect(counterCartStore.get().lines[0]).toMatchObject({
      quantity: 2,
      notes: "Separar embalagens",
    });
    fireEvent.click(screen.getByRole("button", { name: "Remover Pão francês do balcão" }));
    expect(counterCartStore.get().lines).toEqual([]);
  });
  it("respeita limites de quantidade sem aceitar zero, negativos ou decimais", () => {
    function Harness() {
      const counter = useCounterCart();
      return (
        <>
          <button onClick={() => counter.add("p-pao-frances")}>Adicionar</button>
          {[0, -1, 1.5, 100, 99].map((value) => (
            <button key={value} onClick={() => counter.quantity("p-pao-frances", value)}>
              Quantidade {value}
            </button>
          ))}
        </>
      );
    }
    render(
      <CounterCartProvider>
        <Harness />
      </CounterCartProvider>,
    );
    fireEvent.click(screen.getByText("Adicionar"));
    for (const value of [0, -1, 1.5, 100]) {
      fireEvent.click(screen.getByText(`Quantidade ${value}`));
      expect(counterCartStore.get().lines[0]?.quantity).toBe(1);
    }
    fireEvent.click(screen.getByText("Quantidade 99"));
    fireEvent.click(screen.getByText("Adicionar"));
    expect(counterCartStore.get().lines[0]?.quantity).toBe(99);
  });
  it("mantém atendimento na navegação e após sair/entrar na sessão demo", async () => {
    const router = await openCatalog("/admin/balcao");
    await addBread();
    fireEvent.change(screen.getByLabelText("Nome do cliente (opcional)"), {
      target: { value: "Mesa Exemplo" },
    });
    await act(async () => {
      await router.navigate({ to: "/admin/produtos" });
    });
    await act(async () => {
      await router.navigate({ to: "/admin/balcao" });
    });
    expect(await screen.findByLabelText("Nome do cliente (opcional)")).toHaveValue("Mesa Exemplo");
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    await screen.findByRole("heading", { name: "Acesso da equipe" });
    expect(counterCartStore.get().lines).toHaveLength(1);
    fillDemoLogin();
    await screen.findByRole("heading", { name: "Visão geral", level: 1 });
    fireEvent.click(screen.getByRole("link", { name: "Atendimento no balcão" }));
    expect(await screen.findByLabelText("Nome do cliente (opcional)")).toHaveValue("Mesa Exemplo");
  });
  it("limpa apenas após confirmação, preservando o carrinho público", async () => {
    cartStore.set([{ productId: "p-cafe", quantity: 3 }]);
    const publicCart = cartStore.get();
    await openCatalog("/admin/balcao");
    await addBread();
    expect(cartStore.get()).toEqual(publicCart);
    fireEvent.click(screen.getByRole("button", { name: "Limpar pedido" }));
    let dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Continuar atendimento" }));
    expect(counterCartStore.get().lines).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Limpar pedido" }));
    dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar descarte" }));
    expect(counterCartStore.get().lines).toEqual([]);
    expect(cartStore.get()).toEqual(publicCart);
  });
});

describe("PDV: pagamento e registro", () => {
  it.each(["pix", "dinheiro", "cartao"] as const)(
    "registra %s recebido sem nome e sem alterar o carrinho público",
    async (paymentMethod) => {
      cartStore.set([{ productId: "p-cafe", quantity: 1 }]);
      const online = cartStore.get();
      await openCatalog("/admin/balcao");
      await addBread();
      const dialog = await checkout();
      fireEvent.change(within(dialog).getByLabelText("Forma de pagamento"), {
        target: { value: paymentMethod },
      });
      fireEvent.change(within(dialog).getByLabelText("Situação do pagamento"), {
        target: { value: "paid" },
      });
      if (paymentMethod === "dinheiro")
        fireEvent.change(within(dialog).getByLabelText(/Valor entregue/), {
          target: { value: "1,20" },
        });
      await register(dialog);
      expect(dataStore.get().orders[0]).toMatchObject({
        channel: "balcao",
        paymentMethod,
        paymentStatus: "pago",
        totalCents: 120,
        status: "pendente",
      });
      expect(dataStore.get().orders[0]?.customerName).toBeUndefined();
      expect(cartStore.get()).toEqual(online);
      expect(counterCartStore.get().lines).toEqual([]);
      expect(screen.getByRole("region", { name: "Comprovante" })).toHaveTextContent(
        "COMPROVANTE — SEM VALOR FISCAL",
      );
    },
  );
  it("salva nome, observações, pagamento pendente e permite nova venda sem duplicar", async () => {
    const router = await openCatalog("/admin/balcao");
    await addBread();
    fireEvent.change(screen.getByLabelText("Nome do cliente (opcional)"), {
      target: { value: "Mesa Exemplo" },
    });
    fireEvent.change(screen.getByLabelText("Observações gerais do balcão (opcional)"), {
      target: { value: "Embalar separado" },
    });
    fireEvent.change(screen.getByLabelText("Observação de Pão francês"), {
      target: { value: "Quente" },
    });
    await register(await checkout());
    const order = dataStore.get().orders[0]!;
    expect(order).toMatchObject({
      customerName: "Mesa Exemplo",
      notes: "Embalar separado",
      paymentStatus: "pendente",
    });
    expect(order.items[0]?.notes).toBe("Quente");
    await act(async () => {
      await router.navigate({ to: "/admin/produtos" });
      await router.navigate({ to: "/admin/balcao" });
    });
    await screen.findByRole("heading", { name: "Venda registrada com sucesso!" });
    expect(dataStore.get().orders).toHaveLength(15);
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Imprimir comprovante" }));
    expect(print).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Nova venda" }));
    expect(screen.getByRole("button", { name: "Finalizar pedido de balcão" })).toBeDisabled();
    expect(dataStore.get().orders).toHaveLength(15);
  });
  it("calcula troco, rejeita insuficiência/inválidos e limpa campo ao mudar pagamento", async () => {
    await openCatalog("/admin/balcao");
    await addBread();
    const dialog = await checkout();
    fireEvent.change(within(dialog).getByLabelText("Forma de pagamento"), {
      target: { value: "dinheiro" },
    });
    fireEvent.change(within(dialog).getByLabelText("Situação do pagamento"), {
      target: { value: "paid" },
    });
    for (const value of ["1,00", "-2", "abc"]) {
      fireEvent.change(within(dialog).getByLabelText(/Valor entregue/), { target: { value } });
      expect(within(dialog).getByRole("button", { name: "Registrar venda" })).toBeDisabled();
    }
    fireEvent.change(within(dialog).getByLabelText(/Valor entregue/), {
      target: { value: "5,00" },
    });
    expect(within(dialog).getByText(/Troco:/)).toHaveTextContent(money(380));
    fireEvent.change(within(dialog).getByLabelText("Situação do pagamento"), {
      target: { value: "pending" },
    });
    expect(counterCartStore.get().cash).toBe("");
    expect(within(dialog).queryByText(/Troco:/)).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Situação do pagamento"), {
      target: { value: "paid" },
    });
    fireEvent.change(within(dialog).getByLabelText(/Valor entregue/), {
      target: { value: "5,00" },
    });
    fireEvent.change(within(dialog).getByLabelText("Forma de pagamento"), {
      target: { value: "pix" },
    });
    expect(counterCartStore.get().cash).toBe("");
    fireEvent.change(within(dialog).getByLabelText("Forma de pagamento"), {
      target: { value: "dinheiro" },
    });
    fireEvent.change(within(dialog).getByLabelText(/Valor entregue/), {
      target: { value: "5,00" },
    });
    await register(dialog);
    expect(
      within(screen.getByRole("region", { name: "Comprovante" })).getByText(/Troco:/),
    ).toHaveTextContent(money(380));
    expect(dataStore.get().orders[0]?.totalCents).toBe(120);
  });
  it("evita submissões duplicadas e preserva atendimento em caso de falha", async () => {
    const spy = vi
      .spyOn(localServices.orders, "createCounterOrder")
      .mockRejectedValueOnce(new Error("Falha simulada"));
    await openCatalog("/admin/balcao");
    await addBread();
    const dialog = await checkout();
    fireEvent.click(within(dialog).getByRole("button", { name: "Registrar venda" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Falha simulada");
    expect(counterCartStore.get().lines).toHaveLength(1);
    const form = within(dialog).getByRole("button", { name: "Registrar venda" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent.submit(form);
    await screen.findByRole("heading", { name: "Venda registrada com sucesso!" });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(dataStore.get().orders).toHaveLength(15);
  });
});

describe("PDV: catálogo, fila e indicadores", () => {
  it("reage a alteração de preço/nome/categoria e exige revisão explícita", async () => {
    await openCatalog("/admin/balcao");
    await addBread();
    const product = dataStore.get().products[0]!;
    await act(async () => {
      await localServices.catalog.saveProduct(
        { ...product, name: "Novo pão", priceCents: 150, categoryId: "cat-bolos" },
        product.id,
      );
    });
    expect(await screen.findByText("O catálogo mudou durante o atendimento.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalizar pedido de balcão" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Revisei o catálogo atualizado" }));
    await register(await checkout());
    expect(dataStore.get().orders[0]?.items[0]).toMatchObject({
      name: "Novo pão",
      unitPriceCents: 150,
    });
  });
  it.each(["unavailable", "inactive"])("bloqueia %s após seleção", async (kind) => {
    await openCatalog("/admin/balcao");
    expect(
      await screen.findByRole("button", {
        name: "Adicionar Empada de palmito ao pedido de balcão",
      }),
    ).toBeDisabled();
    await addBread();
    await act(async () => {
      if (kind === "unavailable")
        await localServices.catalog.setProductAvailable("p-pao-frances", false);
      else await localServices.catalog.setCategoryActive("cat-paes", false);
    });
    expect(screen.getByRole("button", { name: "Finalizar pedido de balcão" })).toBeDisabled();
    expect(screen.getByText(/Item indisponível/)).toBeInTheDocument();
    expect(counterCartStore.get().lines).toHaveLength(1);
  });
  it("rejeita preço alterado durante envio, mantém itens e permite nova confirmação", async () => {
    await openCatalog("/admin/balcao");
    await addBread();
    const dialog = await checkout();
    const product = dataStore.get().products[0]!;
    const updating = localServices.catalog.saveProduct({ ...product, priceCents: 150 }, product.id);
    fireEvent.click(within(dialog).getByRole("button", { name: "Registrar venda" }));
    await act(async () => {
      await updating;
    });
    await within(dialog).findByText(/O cardápio mudou durante a confirmação/);
    expect(counterCartStore.get().lines).toHaveLength(1);
    expect(dataStore.get().orders).toHaveLength(14);
    fireEvent.click(within(dialog).getByRole("button", { name: "Revisei o catálogo atualizado" }));
    await register(dialog);
    expect(dataStore.get().orders[0]?.totalCents).toBe(150);
  });
  it("integra fila Balcão, conclusão, recebimento posterior e indicadores", async () => {
    const router = await openCatalog("/admin/balcao");
    await addBread();
    await register(await checkout());
    const order = dataStore.get().orders[0]!;
    fireEvent.click(screen.getByRole("link", { name: "Visualizar pedidos" }));
    fireEvent.change(await screen.findByLabelText("Origem"), { target: { value: "balcao" } });
    fireEvent.click(screen.getByRole("button", { name: `Detalhes do pedido ${order.number}` }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Balcão");
    for (const name of ["Em preparação", "Pronto", "Concluído"]) {
      fireEvent.click(await within(dialog).findByRole("button", { name: `Avançar para ${name}` }));
      await waitFor(() =>
        expect(
          within(dialog).queryByRole("button", { name: `Avançar para ${name}` }),
        ).not.toBeInTheDocument(),
      );
    }
    expect(dataStore.get().orders[0]?.history.map((e) => e.status)).toEqual([
      "pendente",
      "em_preparacao",
      "pronto",
      "concluido",
    ]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Marcar como pago" }));
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Confirmar recebimento",
      }),
    );
    await waitFor(() => expect(dataStore.get().orders[0]?.paymentStatus).toBe("pago"));
    await act(async () => {
      await router.navigate({ to: "/admin" });
    });
    expect(await screen.findByRole("region", { name: "Vendas pagas" })).toHaveTextContent(
      money(computeDayMetrics(dataStore.get().orders, new Date()).paidCents),
    );
  });
});
