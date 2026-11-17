import { beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ cookies: vi.fn(), set: vi.fn(), header: vi.fn(), factory: vi.fn() }));
vi.mock("@tanstack/react-start/server", () => ({
  getCookies: f.cookies,
  setCookie: f.set,
  setResponseHeader: f.header,
}));
vi.mock("@/services/auth/cookie-client.server", () => ({
  AUTH_COOKIE: "vr-staff-auth",
  createCookieAuthClient: f.factory,
}));
import { createAuthServerClient, clearAuthCookies } from "@/services/auth/client.server";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AUTH_MODE", "supabase");
  vi.stubEnv("VITE_AUTH_MODE", "supabase");
  vi.stubEnv("SUPABASE_URL", "https://yzxsuoxthkbzbkcumauz.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_abcdefghijklmnopqrstuvwxyz");
  f.cookies.mockReturnValue({
    "vr-staff-auth.0": "opaque-test-cookie",
    "padaria-digital:demo:admin-session:v1": "demo",
  });
});
import { afterEach } from "vitest";
afterEach(() => vi.unstubAllEnvs());
describe("ponte SSR por requisição", () => {
  it("cria cliente independente sem singleton", () => {
    createAuthServerClient();
    createAuthServerClient();
    expect(f.factory).toHaveBeenCalledTimes(2);
  });
  it("marca respostas privadas sem cache compartilhado", () => {
    createAuthServerClient();
    expect(f.header).toHaveBeenCalledWith("Cache-Control", "private, no-store");
    expect(f.header).toHaveBeenCalledWith("Vary", "Cookie");
  });
  it("nunca usa cookies demonstrativos como sessão real", () => {
    createAuthServerClient();
    expect(f.factory.mock.calls[0]![1].getAll()).toEqual([
      { name: "vr-staff-auth.0", value: "opaque-test-cookie" },
    ]);
  });
  it("preserva HttpOnly Secure SameSite mesmo no refresh", () => {
    createAuthServerClient();
    f.factory.mock.calls[0]![1].setAll([
      { name: "vr-staff-auth.0", value: "renewed", options: { httpOnly: false, secure: false } },
    ]);
    expect(f.set).toHaveBeenCalledWith(
      "vr-staff-auth.0",
      "renewed",
      expect.objectContaining({ httpOnly: true, secure: true, sameSite: "lax", path: "/" }),
    );
  });
  it("logout só remove cookies de autenticação", () => {
    clearAuthCookies();
    expect(f.set).toHaveBeenCalledOnce();
    expect(f.set).toHaveBeenCalledWith(
      "vr-staff-auth.0",
      "",
      expect.objectContaining({ maxAge: 0, httpOnly: true }),
    );
  });
});
