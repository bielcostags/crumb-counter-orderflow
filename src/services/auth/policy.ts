import { z } from "zod";
export const staffProfileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(2).max(80),
  role: z.enum(["admin", "atendente"]),
  active: z.boolean(),
});
export type StaffProfile = z.infer<typeof staffProfileSchema>;
export type Permission = "operational" | "staff" | "catalog";
export function mayAccess(profile: StaffProfile | null, permission: Permission): boolean {
  return !!profile?.active && (permission === "operational" || profile.role === "admin");
}
export function permissionForPath(path: string): Permission {
  return /\/(funcionarios|produtos|categorias)(\/|$)/.test(path) ? "staff" : "operational";
}
export const loginSchema = z
  .object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(256) })
  .strict();
export const staffChangeSchema = z
  .object({
    id: z.string().uuid(),
    fullName: z.string().trim().min(2).max(80),
    role: z.enum(["admin", "atendente"]),
    active: z.boolean(),
  })
  .strict();
export interface StaffSession {
  status: "signed-in" | "signed-out" | "denied";
  profile: StaffProfile | null;
}
