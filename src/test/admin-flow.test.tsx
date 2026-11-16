import { act, cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { StoreProvider } from "@/contexts/StoreContext";
import { CartProvider } from "@/contexts/CartContext";
import { AdminSessionProvider } from "@/contexts/AdminSessionContext";
import { Route as Admin } from "@/routes/admin";
import { Route as Access } from "@/routes/admin.acesso";
import { Route as Dashboard } from "@/routes/admin.index";
import { Route as Orders } from "@/routes/admin.pedidos";
import { Route as Checkout } from "@/routes/checkout";
import { Route as Track } from "@/routes/acompanhar";
import { adminSessionStore, cartStore, dataStore, ADMIN_SESSION_KEY } from "@/services/local/store";
import { localServices } from "@/services/local";
import { computeDayMetrics } from "@/lib/orders";
import { formatBRL } from "@/lib/format";
import type { Order } from "@/types";

async function open(path = "/admin/pedidos") {
  const root = createRootRoute({
    component: () => (
      <StoreProvider>
        <CartProvider>
          <AdminSessionProvider>
            <Outlet />
          </AdminSessionProvider>
        </CartProvider>
      </StoreProvider>
    ),
  });
  const admin = createRoute({
    getParentRoute: () => root,
    path: "/admin",
    component: Admin.options.component!,
  });
  const routes = [
    createRoute({ getParentRoute: () => root, path: "/", component: () => <h1>Cardápio</h1> }),
    createRoute({
      getParentRoute: () => root,
      path: "/checkout",
      component: Checkout.options.component!,
    }),
    createRoute({
      getParentRoute: () => root,
      path: "/acompanhar",
      component: Track.options.component!,
      validateSearch: Track.options.validateSearch!,
    }),
    admin.addChildren([
      createRoute({
        getParentRoute: () => admin,
        path: "/",
        component: Dashboard.options.component!,
      }),
      createRoute({
        getParentRoute: () => admin,
        path: "/acesso",
        component: Access.options.component!,
      }),
      createRoute({
        getParentRoute: () => admin,
        path: "/pedidos",
        component: Orders.options.component!,
      }),
    ]),
  ];
  const router = createRouter({
    routeTree: root.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultPendingMinMs: 0,
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return router;
}
function demoOrder(patch: Partial<Order> = {}): Order {
  return { ...dataStore.get().orders[13]!, createdAt: new Date().toISOString(), ...patch };
}
function only(order: Order) {
  dataStore.set((s) => ({ ...s, orders: [order] }));
}
async function details(number: number) {
  fireEvent.click(await screen.findByRole("button", { name: `Detalhes do pedido ${number}` }));
  return screen.findByRole("dialog");
}
beforeEach(() => {
  dataStore.reset();
  cartStore.reset();
  adminSessionStore.set({ signedIn: true, mode: "demo" });
  // Apenas a medição de layout é suprida no jsdom; dados e operações são reais.
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

describe("Sessão e layout administrativo", () => {
  it("redireciona sem sessão, entra e persiste a demonstração, depois sai", async () => {
    adminSessionStore.reset();
    const router = await open();
    await screen.findByRole("heading", { name: "Acesso da equipe" });
    expect(router.state.location.pathname).toBe("/admin/acesso");
    expect(
      screen.queryByRole("navigation", { name: "Área administrativa" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Entrar na demonstração" }));
    await screen.findByRole("heading", { name: "Visão geral", level: 1 });
    expect(JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY)!)).toMatchObject({
      signedIn: true,
      mode: "demo",
    });
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    await screen.findByRole("heading", { name: "Acesso da equipe" });
    expect(adminSessionStore.get().signedIn).toBe(false);
    await act(async () => {
      await router.navigate({ to: "/admin/pedidos" });
    });
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/acesso"));
  });
  it("reutiliza sessão e recolhe o menu sem disponibilizar funcionalidades futuras", async () => {
    await open("/admin/");
    await screen.findByRole("heading", { name: "Visão geral", level: 1 });
    expect(screen.getByLabelText("Atendimento no balcão: em breve")).toHaveTextContent("Em breve");
    expect(screen.getByRole("link", { name: "Produtos" })).toHaveAttribute(
      "href",
      "/admin/produtos",
    );
    fireEvent.click(screen.getByRole("button", { name: "Recolher menu" }));
    expect(screen.getByRole("button", { name: "Expandir menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    fireEvent.click(screen.getByRole("button", { name: "Expandir menu" }));
    expect(screen.getByRole("link", { name: "Pedidos" })).toBeInTheDocument();
  });
});

describe("Dashboard e consulta", () => {
  it("trata ausência de pedidos no dashboard", async () => {
    dataStore.set((s) => ({ ...s, orders: [] }));
    await open("/admin/");
    expect(await screen.findByText("Nenhum pedido registrado")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Pedidos realizados hoje" })).toHaveTextContent("0");
  });
  it("deriva indicadores do store e atualiza pagamentos reativamente", async () => {
    const order = demoOrder({ totalCents: 240, paymentStatus: "pendente", status: "pendente" });
    only(order);
    await open("/admin/");
    expect(
      await screen.findByRole("region", { name: "Pedidos realizados hoje" }),
    ).toHaveTextContent("1");
    expect(screen.getByRole("region", { name: "Valor dos pedidos" })).toHaveTextContent(
      formatBRL(240).replace(/\s/g, " "),
    );
    expect(screen.getByRole("region", { name: "Vendas pagas" })).toHaveTextContent(
      formatBRL(0).replace(/\s/g, " "),
    );
    await act(async () => {
      await localServices.orders.markPaid(order.id);
    });
    expect(screen.getByRole("region", { name: "Vendas pagas" })).toHaveTextContent(
      formatBRL(240).replace(/\s/g, " "),
    );
    await act(async () => {
      await localServices.orders.updateStatus(order.id, "cancelado");
    });
    expect(screen.getByRole("region", { name: "Pedidos realizados hoje" })).toHaveTextContent("0");
    expect(screen.getByRole("region", { name: "Vendas pagas" })).toHaveTextContent(
      formatBRL(0).replace(/\s/g, " "),
    );
    expect(screen.getByRole("region", { name: "Cancelados" })).toHaveTextContent("1");
  });
  it("exibe os dados atuais e permite alternar entre Kanban e lista", async () => {
    await open();
    await screen.findByLabelText("Kanban de pedidos");
    fireEvent.click(screen.getByRole("button", { name: "Lista" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByText("#1014")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kanban" }));
    expect(screen.getByLabelText("Kanban de pedidos")).toBeInTheDocument();
  });
  it("combina pesquisa e todos os filtros e permite limpar", async () => {
    const order = demoOrder();
    only(order);
    await open();
    const query = await screen.findByLabelText("Pesquisar número ou cliente");
    fireEvent.change(query, { target: { value: `#${order.number}` } });
    expect(screen.getByText("1 pedido(s) encontrado(s)")).toBeInTheDocument();
    fireEvent.change(query, { target: { value: order.customerName } });
    for (const [label, value] of [
      ["Status", "pendente"],
      ["Origem", "online"],
      ["Recebimento", "retirada"],
      ["Pagamento", "pendente"],
    ])
      fireEvent.change(screen.getByLabelText(label!), { target: { value } });
    const now = new Date(order.createdAt);
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    fireEvent.change(screen.getByLabelText("Data do pedido"), { target: { value: day } });
    expect(screen.getByText("1 pedido(s) encontrado(s)")).toBeInTheDocument();
    for (const [label, value] of [
      ["Status", "pronto"],
      ["Origem", "balcao"],
      ["Recebimento", "entrega"],
      ["Pagamento", "pago"],
      ["Data do pedido", "2000-01-01"],
    ]) {
      fireEvent.change(screen.getByLabelText(label!), { target: { value } });
      expect(screen.getByText("Nenhum pedido encontrado")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    }
    fireEvent.change(query, { target: { value: "inexistente" } });
    expect(screen.getByText("Nenhum pedido encontrado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(screen.getByText("1 pedido(s) encontrado(s)")).toBeInTheDocument();
  });
  it("mostra dados fictícios completos nos detalhes administrativos", async () => {
    const order = demoOrder({
      fulfillment: "entrega",
      address: "Rua Fictícia, 10",
      notes: "Observação geral",
    });
    only(order);
    await open();
    const dialog = await details(order.number);
    expect(within(dialog).getByText(order.customerPhone!)).toBeInTheDocument();
    expect(within(dialog).getByText("Rua Fictícia, 10")).toBeInTheDocument();
    expect(within(dialog).getByText(/Observações gerais: Observação geral/)).toBeInTheDocument();
    expect(within(dialog).getByText("Histórico de alterações")).toBeInTheDocument();
    expect(within(dialog).getAllByText(/por unidade/)).toHaveLength(order.items.length);
  });
});

describe("Operações da equipe", () => {
  it.each(["retirada", "entrega"] as const)(
    "avança todo o fluxo de %s sem saltos e sem retrocesso",
    async (fulfillment) => {
      const order = demoOrder({ fulfillment });
      only(order);
      await open();
      const dialog = await details(order.number);
      for (const label of fulfillment === "entrega"
        ? ["Em preparação", "Pronto", "Saiu para entrega", "Concluído"]
        : ["Em preparação", "Pronto", "Concluído"]) {
        const advance = within(dialog).getByRole("button", { name: `Avançar para ${label}` });
        fireEvent.click(advance);
        fireEvent.click(advance);
        await waitFor(() =>
          expect(
            within(dialog).queryByRole("button", { name: `Avançar para ${label}` }),
          ).not.toBeInTheDocument(),
        );
      }
      const saved = dataStore.get().orders[0]!;
      expect(saved.status).toBe("concluido");
      expect(saved.history).toHaveLength(fulfillment === "entrega" ? 5 : 4);
      expect(
        within(dialog).queryByRole("button", { name: /Avançar para/ }),
      ).not.toBeInTheDocument();
      expect(
        within(dialog).queryByRole("button", { name: "Cancelar pedido" }),
      ).not.toBeInTheDocument();
    },
  );
  it("confirma pagamento uma única vez, preserva valor e mantém status", async () => {
    const order = demoOrder();
    only(order);
    const spy = vi.spyOn(localServices.orders, "markPaid");
    await open();
    const dialog = await details(order.number);
    fireEvent.click(within(dialog).getByRole("button", { name: "Marcar como pago" }));
    const confirmation = await screen.findByRole("alertdialog");
    expect(dataStore.get().orders[0]?.paymentStatus).toBe("pendente");
    const button = within(confirmation).getByRole("button", { name: "Confirmar recebimento" });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(spy).toHaveBeenCalledTimes(1);
    expect(dataStore.get().orders[0]).toMatchObject({
      paymentStatus: "pago",
      totalCents: order.totalCents,
      status: order.status,
    });
    expect(
      within(dialog).queryByRole("button", { name: "Marcar como pago" }),
    ).not.toBeInTheDocument();
  });
  it("cancela somente após confirmação e informa ausência de estorno", async () => {
    const order = demoOrder({ paymentStatus: "pago" });
    only(order);
    const router = await open();
    const dialog = await details(order.number);
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar pedido" }));
    let confirm = await screen.findByRole("alertdialog");
    expect(confirm).toHaveTextContent("não haverá estorno");
    fireEvent.click(within(confirm).getByRole("button", { name: "Voltar" }));
    expect(dataStore.get().orders[0]?.status).toBe("pendente");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar pedido" }));
    confirm = await screen.findByRole("alertdialog");
    fireEvent.click(within(confirm).getByRole("button", { name: "Confirmar cancelamento" }));
    await waitFor(() => expect(dataStore.get().orders[0]?.status).toBe("cancelado"));
    expect(dataStore.get().orders[0]?.items).toEqual(order.items);
    expect(dataStore.get().orders[0]?.history.at(-1)?.status).toBe("cancelado");
    expect(
      within(dialog).queryByRole("button", { name: "Marcar como pago" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "Cancelar pedido" }),
    ).not.toBeInTheDocument();
    await act(async () => {
      await router.navigate({ to: "/acompanhar", search: { numero: order.number } });
    });
    expect(await screen.findByText("Este pedido foi cancelado.")).toBeInTheDocument();
    expect(screen.queryByText(order.customerPhone!)).not.toBeInTheDocument();
  });
  it("não oferece pagamento para cancelados e apresenta falhas do serviço", async () => {
    const order = demoOrder({ status: "cancelado" });
    only(order);
    await open();
    const dialog = await details(order.number);
    expect(
      within(dialog).queryByRole("button", { name: "Marcar como pago" }),
    ).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /Avançar para/ })).not.toBeInTheDocument();
    await expect(localServices.orders.markPaid(order.id)).rejects.toThrow();
  });
  it("apresenta erro sem alterar pedido quando uma operação falha", async () => {
    const order = demoOrder();
    only(order);
    vi.spyOn(localServices.orders, "updateStatus").mockRejectedValueOnce(
      new Error("Falha simulada"),
    );
    await open();
    const dialog = await details(order.number);
    fireEvent.click(within(dialog).getByRole("button", { name: "Avançar para Em preparação" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Falha simulada");
    expect(dataStore.get().orders[0]?.status).toBe("pendente");
  });
  it("integra checkout, fila, atualização pública, recebimento e dashboard", async () => {
    cartStore.set([{ productId: "p-pao-frances", quantity: 2 }]);
    const router = await open("/checkout");
    fireEvent.change(await screen.findByLabelText(/Nome do cliente/), {
      target: { value: "Cliente Integração" },
    });
    fireEvent.change(screen.getByLabelText(/Telefone com DDD/), {
      target: { value: "00900000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido demonstrativo" }));
    await screen.findByText("Pedido registrado com sucesso!");
    const order = dataStore.get().orders[0]!;
    await act(async () => {
      await router.navigate({ to: "/admin/pedidos" });
    });
    let dialog = await details(order.number);
    fireEvent.click(within(dialog).getByRole("button", { name: "Avançar para Em preparação" }));
    await waitFor(() => expect(dataStore.get().orders[0]?.status).toBe("em_preparacao"));
    await act(async () => {
      await router.navigate({ to: "/acompanhar", search: { numero: order.number } });
    });
    expect(await screen.findByRole("region", { name: "Resumo do pedido" })).toHaveTextContent(
      "Em preparação",
    );
    expect(screen.queryByText("Cliente Integração")).not.toBeInTheDocument();
    await act(async () => {
      await router.navigate({ to: "/admin/pedidos" });
    });
    dialog = await details(order.number);
    fireEvent.click(within(dialog).getByRole("button", { name: "Marcar como pago" }));
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Confirmar recebimento",
      }),
    );
    await waitFor(() => expect(dataStore.get().orders[0]?.paymentStatus).toBe("pago"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Avançar para Pronto" }));
    await within(dialog).findByRole("button", { name: "Avançar para Concluído" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Avançar para Concluído" }));
    await waitFor(() => expect(dataStore.get().orders[0]?.status).toBe("concluido"));
    await act(async () => {
      await router.navigate({ to: "/admin" });
    });
    const expected = computeDayMetrics(dataStore.get().orders, new Date());
    expect(await screen.findByRole("region", { name: "Vendas pagas" })).toHaveTextContent(
      formatBRL(expected.paidCents).replace(/\s/g, " "),
    );
  });
});
