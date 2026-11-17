import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authConfiguration, authMode } from "@/services/auth/config";
import {
  mayAccess,
  permissionForPath,
  loginSchema,
  staffChangeSchema,
} from "@/services/auth/policy";
import { resolveStaffSession, requireStaff } from "@/services/auth/authorization";
const id = "63000000-0000-4000-8000-000000000001";
const profile = { id, full_name: "Equipe teste", role: "atendente" as const, active: true };
function client(
  row: unknown = profile,
  options: { user?: boolean; authError?: unknown; profileError?: unknown } = {},
) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user === false ? null : { id, user_metadata: { role: "admin" } } },
        error: options.authError ?? null,
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: row, error: options.profileError ?? null }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}
describe("autorização centralizada", () => {
  it("nega visitante", () => expect(mayAccess(null, "operational")).toBe(false));
  it("nega perfil inativo", () =>
    expect(mayAccess({ ...profile, active: false }, "operational")).toBe(false));
  it("permite operação a atendente ativo", () =>
    expect(mayAccess(profile, "operational")).toBe(true));
  it("nega gestão a atendente", () => expect(mayAccess(profile, "staff")).toBe(false));
  it("permite gestão a admin ativo", () =>
    expect(mayAccess({ ...profile, role: "admin" }, "staff")).toBe(true));
  it.each(["/admin/funcionarios", "/admin/produtos", "/admin/categorias"])("restringe %s", (path) =>
    expect(permissionForPath(path)).toBe("staff"),
  );
  it("não autoriza sessão demo/metadata no servidor", async () => {
    expect((await resolveStaffSession(client())).profile?.role).toBe("atendente");
    await expect(requireStaff(client(), "staff")).rejects.toThrow("Acesso não autorizado");
  });
  it("valida identidade com getUser", async () => {
    const sdk = client();
    await resolveStaffSession(sdk);
    expect(sdk.auth.getUser).toHaveBeenCalledOnce();
  });
  it("nega usuário não autenticado", async () =>
    expect((await resolveStaffSession(client(null, { user: false }))).status).toBe("signed-out"));
  it("nega usuário sem perfil", async () =>
    expect((await resolveStaffSession(client(null))).status).toBe("denied"));
  it("nega perfil inativo", async () =>
    expect((await resolveStaffSession(client({ ...profile, active: false }))).status).toBe(
      "denied",
    ));
  it("nega perfil pertencente a outra identidade", async () =>
    expect(
      (
        await resolveStaffSession(
          client({ ...profile, id: "63000000-0000-4000-8000-000000000002" }),
        )
      ).status,
    ).toBe("denied"));
  it("nega sessão expirada", async () =>
    expect((await resolveStaffSession(client(null, { authError: { status: 401 } }))).status).toBe(
      "signed-out",
    ));
  it("erro de rede não vira demo", async () =>
    await expect(resolveStaffSession(client(null, { authError: { status: 0 } }))).rejects.toThrow(
      "Não foi possível verificar",
    ));
  it("erro de perfil nega acesso", async () =>
    await expect(
      resolveStaffSession(client(null, { profileError: { message: "private database failure" } })),
    ).rejects.toThrow("Não foi possível verificar"));
  it("perfil com papel arbitrário é rejeitado", async () =>
    expect((await resolveStaffSession(client({ ...profile, role: "root" }))).status).toBe(
      "denied",
    ));
  it("entrada de gestão não aceita campos de identidade extras", () =>
    expect(
      staffChangeSchema.safeParse({
        id,
        fullName: "Nome teste",
        role: "admin",
        active: true,
        actor_id: id,
      }).success,
    ).toBe(false));
  it("login valida e-mail", () =>
    expect(loginSchema.safeParse({ email: "invalid", password: "password" }).success).toBe(false));
});
describe("configuração explícita e sem fallback", () => {
  const env = {
    AUTH_MODE: "supabase",
    VITE_AUTH_MODE: "supabase",
    SUPABASE_URL: "https://yzxsuoxthkbzbkcumauz.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abcdefghijklmnopqrstuvwxyz",
  };
  it("demo é padrão", () => expect(authMode(undefined)).toBe("demo"));
  it("modo inválido falha fechado", () => expect(() => authMode("anything")).toThrow());
  it("configuração remota válida", () => expect(authConfiguration(env).secure).toBe(true));
  it("servidor demo não aceita ativação pelo cliente", () =>
    expect(() => authConfiguration({ ...env, AUTH_MODE: "demo" })).toThrow());
  it("cliente demo não ativa servidor real", () =>
    expect(() => authConfiguration({ ...env, VITE_AUTH_MODE: "demo" })).toThrow());
  it("não permite projeto remoto diferente", () =>
    expect(() =>
      authConfiguration({ ...env, SUPABASE_URL: "https://another.supabase.co" }),
    ).toThrow());
  it("não aceita segredo no lugar da chave pública", () =>
    expect(() =>
      authConfiguration({ ...env, SUPABASE_PUBLISHABLE_KEY: "sb_secret_should_never_be_used" }),
    ).toThrow());
  it("não aceita configuração incompleta", () =>
    expect(() =>
      authConfiguration({ AUTH_MODE: "supabase", VITE_AUTH_MODE: "supabase" }),
    ).toThrow());
  it("permite somente loopback explícito para testes locais", () =>
    expect(
      authConfiguration({ ...env, AUTH_TARGET: "local", SUPABASE_URL: "http://127.0.0.1:54321" })
        .secure,
    ).toBe(false));
});
