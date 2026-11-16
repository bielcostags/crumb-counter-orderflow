import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

import { adminSessionStore } from "@/services/local/store";

/**
 * Sessão de DEMONSTRAÇÃO. Não há autenticação real: qualquer pessoa com acesso
 * ao navegador entra. Substituir por Supabase Auth + papéis (RLS) na próxima fase.
 */
interface AdminSessionValue {
  status: "loading" | "signed-in" | "signed-out";
  signInDemo: () => void;
  signOut: () => void;
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null);
const getServerSnapshot = () => null;

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(
    adminSessionStore.subscribe,
    adminSessionStore.get,
    getServerSnapshot,
  );
  const status = session === null ? "loading" : session.signedIn ? "signed-in" : "signed-out";
  return (
    <AdminSessionContext.Provider
      value={{
        status,
        signInDemo: () => adminSessionStore.set({ signedIn: true, mode: "demo" }),
        signOut: () => adminSessionStore.set({ signedIn: false, mode: "demo" }),
      }}
    >
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) throw new Error("useAdminSession deve ser usado dentro de <AdminSessionProvider>.");
  return ctx;
}
