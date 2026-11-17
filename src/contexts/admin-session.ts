import { createContext, useContext } from "react";
import type { StaffProfile } from "@/services/auth/policy";
export interface AdminSessionValue {
  status: "loading" | "signed-in" | "signed-out" | "denied" | "error";
  mode: "demo" | "supabase";
  profile: StaffProfile | null;
  error: string;
  signInDemo: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void | Promise<void>;
  refresh: () => void | Promise<void>;
}
export const AdminSessionContext = createContext<AdminSessionValue | null>(null);
export function useAdminSession() {
  const value = useContext(AdminSessionContext);
  if (!value) throw new Error("useAdminSession deve ser usado dentro de <AdminSessionProvider>.");
  return value;
}
