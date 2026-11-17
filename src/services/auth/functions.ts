import { createServerFn } from "@tanstack/react-start";
import { loginSchema, staffChangeSchema, staffProfileSchema } from "./policy";
import { resolveStaffSession, requireStaff } from "./authorization";
import { createAuthServerClient, clearAuthCookies } from "./client.server";
export const currentStaff = createServerFn({ method: "GET" }).handler(async () =>
  resolveStaffSession(createAuthServerClient()),
);
export const loginStaff = createServerFn({ method: "POST" })
  .validator(loginSchema)
  .handler(async ({ data }) => {
    const client = createAuthServerClient();
    try {
      const result = await client.auth.signInWithPassword(data);
      if (result.error)
        throw new Error("Não foi possível entrar. Confira os dados ou tente novamente.");
      return await resolveStaffSession(client);
    } catch {
      throw new Error("Não foi possível entrar. Confira os dados ou tente novamente.");
    }
  });
export const logoutStaff = createServerFn({ method: "POST" }).handler(async () => {
  const client = createAuthServerClient();
  try {
    await client.auth.signOut({ scope: "local" });
  } finally {
    clearAuthCookies();
  }
  return { success: true };
});
export const listStaff = createServerFn({ method: "GET" }).handler(async () => {
  const client = createAuthServerClient();
  await requireStaff(client, "staff");
  const { data, error } = await client
    .from("profiles")
    .select("id,full_name,role,active")
    .order("full_name")
    .limit(100);
  if (error) throw new Error("Não foi possível consultar os funcionários.");
  return staffProfileSchema.array().parse(data);
});
export const changeStaff = createServerFn({ method: "POST" })
  .validator(staffChangeSchema)
  .handler(async ({ data }) => {
    if (process.env["STAFF_MANAGEMENT_ENABLED"] !== "true")
      throw new Error("Gestão de funcionários ainda não liberada.");
    const client = createAuthServerClient();
    const actor = await requireStaff(client, "staff");
    if (actor.id === data.id) throw new Error("Não é permitido alterar o próprio perfil.");
    const { error } = await client.rpc("manage_staff_profile", {
      target_id: data.id,
      target_name: data.fullName,
      target_role: data.role,
      target_active: data.active,
    });
    if (error)
      throw new Error(
        "Alteração não realizada. Verifique as permissões e preserve ao menos um administrador ativo.",
      );
    return { success: true };
  });
