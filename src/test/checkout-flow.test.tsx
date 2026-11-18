import { createSeedStore as createTechnicalStore } from "@/test/fixtures/catalog";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
import { Route as CartRoute } from "@/routes/carrinho";
import { Route as CheckoutRoute } from "@/routes/checkout";
import { Route as TrackRoute } from "@/routes/acompanhar";
import { dataStore, cartStore } from "@/services/local/store";
import { localServices } from "@/services/local";

async function open(path = "/checkout") {
  const root = createRootRoute({
    component: () => (
      <StoreProvider>
        <CartProvider>
          <Outlet />
        </CartProvider>
      </StoreProvider>
    ),
  });
  const routes = [
    createRoute({ getParentRoute: () => root, path: "/", component: () => <h1>Cardápio</h1> }),
    createRoute({
      getParentRoute: () => root,
      path: "/carrinho",
      component: CartRoute.options.component!,
    }),
    createRoute({
      getParentRoute: () => root,
      path: "/checkout",
      component: CheckoutRoute.options.component!,
    }),
    createRoute({
      getParentRoute: () => root,
      path: "/acompanhar",
      component: TrackRoute.options.component!,
      validateSearch: TrackRoute.options.validateSearch!,
    }),
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
function fill() {
  fireEvent.change(screen.getByLabelText(/Nome do cliente/), {
    target: { value: "Cliente Fictício" },
  });
  fireEvent.change(screen.getByLabelText(/Telefone com DDD/), { target: { value: "00900000000" } });
}
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));
beforeEach(() => {
  dataStore.set(createTechnicalStore(new Date()));
  cartStore.set([{ productId: "p-pao-frances", quantity: 2 }]);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Checkout e navegação", () => {
  it("navega do carrinho ao checkout, confirma retirada sem endereço e acompanha", async () => {
    const router = await open("/carrinho");
    fireEvent.click(await screen.findByRole("link", { name: "Finalizar pedido" }));
    await screen.findByRole("heading", { name: "Finalizar pedido" });
    fill();
    expect(screen.queryByLabelText(/Endereço de entrega/)).not.toBeInTheDocument();
    submit();
    await screen.findByText("Pedido registrado com sucesso!");
    expect(cartStore.get()).toEqual([]);
    const order = dataStore.get().orders[0]!;
    expect(order).toMatchObject({
      totalCents: 240,
      status: "pendente",
      paymentStatus: "pendente",
      fulfillment: "retirada",
    });
    fireEvent.click(
      screen
        .getAllByRole("link", { name: "Acompanhar pedido" })
        .find((link) => link.getAttribute("href")?.includes(`numero=${order.number}`))!,
    );
    await screen.findByRole("heading", { name: "Linha do tempo" });
    expect(router.state.location.pathname).toBe("/acompanhar");
    expect(screen.getByRole("heading", { name: `Pedido #${order.number}` })).toBeInTheDocument();
    expect(screen.queryByText("Cliente Fictício")).not.toBeInTheDocument();
  });
  it("valida checkout inválido e entrega sem endereço, depois registra entrega", async () => {
    await open();
    await screen.findByLabelText(/Nome do cliente/);
    submit();
    expect(await screen.findByText(/Informe um nome/)).toBeInTheDocument();
    fill();
    fireEvent.change(screen.getByLabelText("Tipo de recebimento"), {
      target: { value: "entrega" },
    });
    submit();
    expect(await screen.findByText(/Informe o endereço/)).toBeInTheDocument();
    expect(cartStore.get()).toHaveLength(1);
    for (const [label, value] of [
      ["CEP", "00000000"],
      ["Rua/logradouro", "Rua Fictícia"],
      ["Número", "123"],
      ["Bairro", "Bairro Exemplo"],
      ["Cidade", "Cidade Exemplo"],
      ["Estado/UF", "RO"],
    ])
      fireEvent.change(screen.getByLabelText(label!), { target: { value } });
    fireEvent.change(screen.getByLabelText("Forma de pagamento ao receber"), {
      target: { value: "cartao" },
    });
    submit();
    await screen.findByText("Pedido registrado com sucesso!");
    expect(dataStore.get().orders[0]).toMatchObject({
      fulfillment: "entrega",
      paymentMethod: "cartao",
    });
  });
  it("bloqueia checkout vazio", async () => {
    cartStore.set([]);
    await open();
    expect(await screen.findByText("Seu carrinho está vazio")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirmar pedido/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver cardápio" })).toHaveAttribute("href", "/");
  });
  it("bloqueia produto indisponível e preserva o carrinho", async () => {
    cartStore.set([{ productId: "p-empada", quantity: 1 }]);
    await open();
    expect(await screen.findByRole("alert")).toHaveTextContent("indisponível");
    expect(screen.getByRole("button", { name: /Confirmar pedido/ })).toBeDisabled();
    expect(cartStore.get()).toHaveLength(1);
  });
  it("preserva carrinho e permite nova tentativa quando o serviço falha", async () => {
    vi.spyOn(localServices.orders, "createOnlineOrder").mockRejectedValueOnce(
      new Error("Falha simulada"),
    );
    await open();
    await screen.findByLabelText(/Nome do cliente/);
    fill();
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha simulada");
    expect(cartStore.get()).toHaveLength(1);
    submit();
    await screen.findByText("Pedido registrado com sucesso!");
  });
  it("impede múltiplos envios durante o registro", async () => {
    const spy = vi.spyOn(localServices.orders, "createOnlineOrder");
    await open();
    await screen.findByLabelText(/Nome do cliente/);
    fill();
    const form = screen.getByRole("button", { name: /Confirmar pedido/ }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Registrando pedido…" })).toBeDisabled();
    await screen.findByText("Pedido registrado com sucesso!");
    expect(dataStore.get().orders).toHaveLength(15);
  });
});

describe("Consulta pública", () => {
  it("consulta existente e reage a mudanças locais sem expor dados pessoais", async () => {
    const order = dataStore
      .get()
      .orders.find((o) => o.status === "pendente" && o.fulfillment === "entrega")!;
    await open(`/acompanhar?numero=${order.number}`);
    const summary = await screen.findByRole("region", { name: "Resumo do pedido" });
    expect(summary).not.toHaveTextContent(order.customerPhone!);
    expect(summary).not.toHaveTextContent(order.address!);
    expect(summary).not.toHaveTextContent(order.customerName!);
    expect(within(summary).getByText("Pendente")).toBeInTheDocument();
    await act(async () => {
      await localServices.orders.updateStatus(order.id, "em_preparacao");
    });
    expect(within(summary).getByText("Em preparação")).toBeInTheDocument();
    await act(async () => {
      await localServices.orders.updateStatus(order.id, "cancelado");
    });
    expect(await screen.findByText("Este pedido foi cancelado.")).toBeInTheDocument();
  });
  it("trata consulta inexistente e número inválido", async () => {
    await open("/acompanhar");
    const input = await screen.findByLabelText("Número do pedido");
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("número de pedido válido");
    fireEvent.change(input, { target: { value: "999999" } });
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
    await screen.findByText("Pedido não encontrado");
    fireEvent.change(input, { target: { value: "#1001" } });
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
    await screen.findByRole("heading", { name: "Pedido #1001" });
    await waitFor(() =>
      expect(screen.queryByText("Pedido não encontrado")).not.toBeInTheDocument(),
    );
  });
});
