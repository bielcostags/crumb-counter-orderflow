import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateDemo, mayAccessDemo, parseDemoIdentity } from "@/services/local/demo-session";
import { adminSessionStore, ADMIN_SESSION_KEY, dataStore, cartStore } from "@/services/local/store";
import { createPersistentStore } from "@/lib/persistent-store";
import { demoAdminSession, demoEmployeeSession, fillDemoLogin } from "./helpers/demo-session";
import { openCatalog } from "./helpers/catalog-router";
import { localServices } from "@/services/local";
import { AdminSessionProvider } from "@/contexts/AdminSessionContext";
import { useAdminSession } from "@/contexts/admin-session";
beforeEach(() => {
  adminSessionStore.reset();
  dataStore.reset();
  cartStore.reset();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("Contas da apresentação", () => {
  it.each([
    ["admin@vilarica.demo", "Admin@Demo2026", "admin"],
    ["funcionario@vilarica.demo", "Funcionario@Demo2026", "funcionario"],
  ])("valida %s sem persistir senha", (email, password, role) => {
    const identity = authenticateDemo(email!, password!);
    expect(identity.role).toBe(role);
    expect(identity).not.toHaveProperty("password");
  });
  it.each([
    ["admin@vilarica.demo", "errada"],
    ["inexistente@vilarica.demo", "Admin@Demo2026"],
    ["", ""],
  ])("nega credenciais %s", (email, password) => {
    expect(() => authenticateDemo(email!, password!)).toThrow("E-mail ou senha incorretos");
  });
  it.each(["/admin", "/admin/produtos", "/admin/categorias", "/admin/funcionarios"])(
    "nega funcionário em %s",
    (path) => {
      expect(mayAccessDemo(demoEmployeeSession.identity, path)).toBe(false);
    },
  );
  it("persiste identidade canônica e rejeita sessão antiga/identidade com papel adulterado", () => {
    adminSessionStore.set(demoAdminSession);
    const restored = createPersistentStore(
      ADMIN_SESSION_KEY,
      () => null,
      (raw) => {
        const value = raw as typeof demoAdminSession;
        return value.signedIn ? parseDemoIdentity(value.identity) : null;
      },
    ).get();
    expect(restored).toEqual(demoAdminSession.identity);
    expect(parseDemoIdentity({ signedIn: true })).toBeNull();
    expect(parseDemoIdentity({ ...demoEmployeeSession.identity, role: "admin" })).toBeNull();
    expect(localStorage.getItem(ADMIN_SESSION_KEY)).not.toContain("password");
  });
  it("sessão antiga não monta conteúdo administrativo", async () => {
    adminSessionStore.set({ signedIn: true, mode: "demo" });
    await openCatalog("/admin/produtos");
    expect(await screen.findByRole("heading", { name: "Acesso da equipe" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
  it("mostra erro, alterna senha e entra com administrador", async () => {
    await openCatalog("/admin/acesso");
    await screen.findByLabelText("Senha");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "admin@vilarica.demo" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "errada" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("incorretos");
    fillDemoLogin();
    await screen.findByRole("link", { name: "Produtos" });
  });
  it("funcionário entra em pedidos, sai sem apagar dados e troca para admin", async () => {
    const orders = dataStore.get().orders;
    cartStore.set([{ productId: dataStore.get().products[0]!.id, quantity: 1 }]);
    const router = await openCatalog("/admin/acesso");
    await screen.findByLabelText("E-mail");
    fillDemoLogin(true);
    await screen.findByLabelText("Kanban de pedidos");
    expect(screen.queryByRole("link", { name: "Produtos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Visão geral" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    await screen.findByLabelText("E-mail");
    expect(dataStore.get().orders).toEqual(orders);
    expect(cartStore.get()).toHaveLength(1);
    fillDemoLogin();
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin"));
  });
  it.each(["/admin/produtos", "/admin/categorias", "/admin"])(
    "bloqueia URL direta %s",
    async (path) => {
      adminSessionStore.set(demoEmployeeSession);
      const router = await openCatalog(path);
      await screen.findByLabelText("Kanban de pedidos");
      expect(router.state.location.pathname).toBe("/admin/pedidos");
    },
  );
  it("revalida permissão ao executar mutação local", async () => {
    adminSessionStore.set({
      signedIn: true,
      mode: "demo",
      identity: { ...demoEmployeeSession.identity, role: "admin" },
    });
    await expect(
      localServices.catalog.setProductAvailable(dataStore.get().products[0]!.id, false),
    ).rejects.toThrow("administrador");
    adminSessionStore.set(demoEmployeeSession);
    await expect(
      localServices.catalog.setProductAvailable(dataStore.get().products[0]!.id, false),
    ).rejects.toThrow("administrador");
    await expect(
      localServices.catalog.saveCategory({ name: "Proibida", active: true }),
    ).rejects.toThrow("administrador");
  });
  it("não permite login programático sem credenciais", () => {
    function Probe() {
      const session = useAdminSession();
      return <button onClick={() => expect(() => session.signInDemo()).toThrow()}>Tentar</button>;
    }
    render(
      <AdminSessionProvider>
        <Probe />
      </AdminSessionProvider>,
    );
    fireEvent.click(screen.getByText("Tentar"));
    expect(adminSessionStore.get().signedIn).toBe(false);
  });
  it("reidrata pelo parser real e invalida sessão legada no armazenamento", async () => {
    function Probe() {
      const session = useAdminSession();
      return (
        <p>
          {session.status}:{session.demoIdentity?.role}
        </p>
      );
    }
    render(
      <AdminSessionProvider>
        <Probe />
      </AdminSessionProvider>,
    );
    await act(async () => {
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(demoEmployeeSession));
      window.dispatchEvent(new StorageEvent("storage", { key: ADMIN_SESSION_KEY }));
    });
    expect(screen.getByText("signed-in:funcionario")).toBeInTheDocument();
    await act(async () => {
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ signedIn: true, mode: "demo" }));
      window.dispatchEvent(new StorageEvent("storage", { key: ADMIN_SESSION_KEY }));
    });
    expect(screen.getByText("signed-out:")).toBeInTheDocument();
    expect(adminSessionStore.get().identity).toBeUndefined();
  });
});
