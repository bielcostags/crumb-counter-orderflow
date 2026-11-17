import type { SupabaseClient } from "@supabase/supabase-js";
import { staffProfileSchema, mayAccess, type Permission, type StaffSession } from "./policy";
/** Authoritative identity is checked with Auth on every server operation, never getSession alone. */
export async function resolveStaffSession(client: SupabaseClient): Promise<StaffSession> {
  const { data, error } = await client.auth.getUser();
  if (error) {
    if (
      error.status === 400 ||
      error.status === 401 ||
      error.status === 403 ||
      error.name === "AuthSessionMissingError"
    )
      return { status: "signed-out", profile: null };
    throw new Error("Não foi possível verificar a sessão. Tente novamente.");
  }
  if (!data.user) return { status: "signed-out", profile: null };
  const result = await client
    .from("profiles")
    .select("id,full_name,role,active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (result.error) throw new Error("Não foi possível verificar o acesso. Tente novamente.");
  const profile = staffProfileSchema.safeParse(result.data);
  if (!profile.success || profile.data.id !== data.user.id || !profile.data.active)
    return { status: "denied", profile: null };
  return { status: "signed-in", profile: profile.data };
}
export async function requireStaff(client: SupabaseClient, permission: Permission = "operational") {
  const session = await resolveStaffSession(client);
  if (!mayAccess(session.profile, permission)) throw new Error("Acesso não autorizado.");
  return session.profile!;
}
