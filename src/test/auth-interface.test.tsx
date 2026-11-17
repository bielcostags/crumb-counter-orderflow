import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openCatalog } from "@/test/helpers/catalog-router";
import { StaffSessionProvider } from "@/contexts/StaffSessionContext";
import { useAdminSession } from "@/contexts/admin-session";
const f = vi.hoisted(() => ({ current: vi.fn(), login: vi.fn(), logout: vi.fn() }));
vi.mock("@/services/auth/functions", () => ({
  currentStaff: f.current,
  loginStaff: f.login,
  logoutStaff: f.logout,
}));
const person = {
  id: "63000000-0000-4000-8000-000000000001",
  full_name: "Equipe teste",
  role: "atendente" as const,
  active: true,
};
function Probe() {
  const s = useAdminSession();
  return (
    <>
      <p role="status">{s.status}</p>
      {s.status === "signed-in" && <p>Privado: {s.profile?.full_name}</p>}
      {s.error && <p role="alert">{s.error}</p>}
      <button onClick={() => void s.signIn("team@example.invalid", "test-password")}>Entrar</button>
      <button onClick={() => void s.signOut()}>Sair</button>
      <button
        onClick={() => {
          try {
            s.signInDemo();
          } catch {
            /* Demo must not authorize a real session. */
          }
        }}
      >
        Forjar demo
      </button>
    </>
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  f.current.mockResolvedValue({ status: "signed-out", profile: null });
  f.logout.mockResolvedValue({ success: true });
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("sessão autenticada de interface (transportes simulados)", () => {
  it("não mostra conteúdo privado enquanto carrega", () => {
    f.current.mockReturnValue(new Promise(() => {}));
    render(
      <StaffSessionProvider>
        <Probe />
      </StaffSessionProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("loading");
    expect(screen.queryByText(/Privado:/)).not.toBeInTheDocument();
  });
  it("login válido mostra só o perfil retornado pelo servidor", async () => {
    f.login.mockResolvedValue({ status: "signed-in", profile: person });
    render(
      <StaffSessionProvider>
        <Probe />
      </StaffSessionProvider>,
    );
    await screen.findByText("signed-out");
    fireEvent.click(screen.getByText("Entrar"));
    expect(await screen.findByText("Privado: Equipe teste")).toBeInTheDocument();
  });
  it("login inválido mostra erro genérico", async () => {
    f.login.mockRejectedValue(new Error("sensitive service detail"));
    render(
      <StaffSessionProvider>
        <Probe />
      </StaffSessionProvider>,
    );
    await screen.findByText("signed-out");
    fireEvent.click(screen.getByText("Entrar"));
    expect(await screen.findByRole("alert")).not.toHaveTextContent("sensitive");
    expect(screen.queryByText(/Privado:/)).not.toBeInTheDocument();
  });
  it("nega usuário sem perfil ativo", async () => {
    f.current.mockResolvedValue({ status: "denied", profile: null });
    render(
      <StaffSessionProvider>
        <Probe />
      </StaffSessionProvider>,
    );
    await screen.findByText("denied");
    expect(screen.queryByText(/Privado:/)).not.toBeInTheDocument();
  });
  it("falha de rede não faz fallback", async () => {
    f.current.mockRejectedValue(new Error("network"));
    render(
      <StaffSessionProvider>
        <Probe />
      </StaffSessionProvider>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível verificar");
    expect(screen.queryByText(/Privado:/)).not.toBeInTheDocument();
  });
  it("sessão demo não concede identidade real", async () => {
    localStorage.setItem(
      "padaria-digital:demo:admin-session:v1",
      JSON.stringify({ signedIn: true, role: "admin", mode: "demo" }),
    );
    render(
      <StaffSessionProvider>
        <Probe />
      </StaffSessionProvider>,
    );
    await screen.findByText("signed-out");
    fireEvent.click(screen.getByText("Forjar demo"));
    expect(screen.getByRole("status")).toHaveTextContent("signed-out");
  });
  it("logout remove imediatamente os dados privados sem apagar o carrinho", async () => {
    f.current.mockResolvedValue({ status: "signed-in", profile: person });
    localStorage.setItem("test-preserved-cart", "preserve");
    render(
      <StaffSessionProvider>
        <Probe />
      </StaffSessionProvider>,
    );
    await screen.findByText("Privado: Equipe teste");
    fireEvent.click(screen.getByText("Sair"));
    expect(screen.queryByText(/Privado:/)).not.toBeInTheDocument();
    await waitFor(() => expect(f.logout).toHaveBeenCalledOnce());
    expect(localStorage.getItem("test-preserved-cart")).toBe("preserve");
  });
  it("revalida e remove sessão expirada ao voltar à janela", async () => {
    f.current
      .mockResolvedValueOnce({ status: "signed-in", profile: person })
      .mockResolvedValue({ status: "signed-out", profile: null });
    render(
      <StaffSessionProvider>
        <Probe />
      </StaffSessionProvider>,
    );
    await screen.findByText("Privado: Equipe teste");
    act(() => window.dispatchEvent(new Event("focus")));
    await screen.findByText("signed-out");
    expect(screen.queryByText(/Privado:/)).not.toBeInTheDocument();
  });
  it("resposta antiga não restaura usuário após logout", async () => {
    let resolve!: (v: unknown) => void;
    f.current.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    render(
      <StaffSessionProvider>
        <Probe />
      </StaffSessionProvider>,
    );
    fireEvent.click(screen.getByText("Sair"));
    await act(async () => resolve({ status: "signed-in", profile: person }));
    expect(screen.getByRole("status")).toHaveTextContent("signed-out");
  });
});

describe("rotas internas no modo real", () => {
  it("visitante é encaminhado ao formulário real, mesmo com sessão demo forjada", async () => {
    vi.stubEnv("VITE_AUTH_MODE", "supabase");
    localStorage.setItem(
      "padaria-digital:demo:admin-session:v1",
      JSON.stringify({ signedIn: true, mode: "demo" }),
    );
    await openCatalog("/admin");
    expect(await screen.findByRole("textbox", { name: "E-mail" })).toBeInTheDocument();
    expect(screen.queryByText("Área autenticada")).not.toBeInTheDocument();
  });
  it("atendente não acessa tela exclusiva administrativa", async () => {
    vi.stubEnv("VITE_AUTH_MODE", "supabase");
    f.current.mockResolvedValue({ status: "signed-in", profile: person });
    await openCatalog("/admin/produtos");
    expect(await screen.findByRole("alert")).toHaveTextContent("Acesso não autorizado");
    expect(screen.queryByRole("button", { name: /Novo produto/ })).not.toBeInTheDocument();
  });
  it("admin autorizado não recebe módulos de negócio locais como fallback", async () => {
    vi.stubEnv("VITE_AUTH_MODE", "supabase");
    f.current.mockResolvedValue({ status: "signed-in", profile: { ...person, role: "admin" } });
    await openCatalog("/admin");
    expect(await screen.findByRole("heading", { name: "Área autenticada" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Funcionários" })).toBeInTheDocument();
    expect(screen.getByText(/Nenhum dado demonstrativo é exibido/)).toBeInTheDocument();
  });
});

describe("concorrência entre autenticação e revalidação", () => {
  it("foco não restaura sessão enquanto logout aguarda resposta", async () => {
    f.current.mockResolvedValue({ status: "signed-in", profile: person });
    let finish!: () => void;
    f.logout.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <StaffSessionProvider>
        <Probe />
      </StaffSessionProvider>,
    );
    await screen.findByText("Privado: Equipe teste");
    fireEvent.click(screen.getByText("Sair"));
    await act(async () => window.dispatchEvent(new Event("focus")));
    expect(screen.queryByText(/Privado:/)).not.toBeInTheDocument();
    expect(f.current).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    await screen.findByText("signed-out");
  });
  it("foco não invalida o resultado do login pendente", async () => {
    let finish!: (value: unknown) => void;
    f.login.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <StaffSessionProvider>
        <Probe />
      </StaffSessionProvider>,
    );
    await screen.findByText("signed-out");
    fireEvent.click(screen.getByText("Entrar"));
    await act(async () => window.dispatchEvent(new Event("focus")));
    expect(f.current).toHaveBeenCalledTimes(1);
    await act(async () => finish({ status: "signed-in", profile: person }));
    expect(await screen.findByText("Privado: Equipe teste")).toBeInTheDocument();
  });
});
