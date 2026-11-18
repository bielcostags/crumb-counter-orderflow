import { createContext, useContext } from "react";
import type { StaffProfile } from "@/services/auth/policy";
import type { DemoIdentity } from "@/services/local/demo-session";
export interface AdminSessionValue {
  demoIdentity?: DemoIdentity | null;
  status: "loading" | "signed-in" | "signed-out" | "denied" | "error";
  mode: "demo" | "supabase";
  profile: StaffProfile | null;
  error: string;
  signInDemo: (email?: string, password?: string) => void;
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
