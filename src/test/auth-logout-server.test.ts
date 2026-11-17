import { beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ signOut: vi.fn(), clear: vi.fn() }));
// Exercise the server handler independently from the HTTP transport/compiler.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    handler: (handler: unknown) => handler,
    validator: () => ({ handler: (handler: unknown) => handler }),
  }),
}));
vi.mock("@/services/auth/client.server", () => ({
  createAuthServerClient: () => ({ auth: { signOut: f.signOut } }),
  clearAuthCookies: f.clear,
}));
import { logoutStaff } from "@/services/auth/functions";
beforeEach(() => {
  vi.clearAllMocks();
  f.signOut.mockResolvedValue({ error: null });
});
describe("confirmação de logout no servidor", () => {
  it("confirma revogação e limpa cookies", async () => {
    await expect(logoutStaff()).resolves.toEqual({ success: true });
    expect(f.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(f.clear).toHaveBeenCalledOnce();
  });
  it("não confirma sucesso se Auth retorna erro", async () => {
    f.signOut.mockResolvedValue({ error: { message: "sensitive upstream response" } });
    await expect(logoutStaff()).rejects.toThrow("Não foi possível confirmar a saída");
    expect(f.clear).toHaveBeenCalledOnce();
  });
  it("limpa cookies mesmo quando comunicação falha", async () => {
    f.signOut.mockRejectedValue(new Error("sensitive network detail"));
    await expect(logoutStaff()).rejects.toThrow("Não foi possível confirmar a saída");
    expect(f.clear).toHaveBeenCalledOnce();
  });
});
