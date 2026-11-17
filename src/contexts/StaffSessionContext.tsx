import { useEffect, useCallback, useRef, useState, type ReactNode } from "react";
import { AdminSessionContext, type AdminSessionValue } from "./admin-session";
import { currentStaff, loginStaff, logoutStaff } from "@/services/auth/functions";

export function StaffSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Pick<AdminSessionValue, "status" | "profile" | "error">>({
    status: "loading",
    profile: null,
    error: "",
  });
  const epoch = useRef(0);
  const mounted = useRef(true);
  const refresh = useCallback(async () => {
    const request = ++epoch.current;
    // Remove private component trees while identity/active status is being revalidated.
    setSession({ status: "loading", profile: null, error: "" });
    try {
      const result = await currentStaff();
      if (mounted.current && request === epoch.current) setSession({ ...result, error: "" });
    } catch {
      if (mounted.current && request === epoch.current)
        setSession({
          status: "error",
          profile: null,
          error: "Não foi possível verificar a sessão. Tente novamente.",
        });
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const onFocus = () => {
      void refresh();
    };
    const timer = setInterval(onFocus, 60_000);
    window.addEventListener("focus", onFocus);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  const signIn = async (email: string, password: string) => {
    const request = ++epoch.current;
    setSession({ status: "loading", profile: null, error: "" });
    try {
      const result = await loginStaff({ data: { email, password } });
      if (mounted.current && request === epoch.current) setSession({ ...result, error: "" });
    } catch {
      if (mounted.current && request === epoch.current)
        setSession({
          status: "error",
          profile: null,
          error: "Não foi possível entrar. Confira os dados ou tente novamente.",
        });
    }
  };
  const signOut = async () => {
    const request = ++epoch.current;
    setSession({ status: "signed-out", profile: null, error: "" });
    try {
      await logoutStaff();
    } catch {
      if (mounted.current && request === epoch.current)
        setSession({
          status: "error",
          profile: null,
          error: "Não foi possível confirmar a saída. Tente sair novamente.",
        });
    }
  };
  return (
    <AdminSessionContext.Provider
      value={{
        ...session,
        mode: "supabase",
        signIn,
        signOut,
        refresh,
        signInDemo: () => {
          throw new Error("Sessão demonstrativa não autoriza acesso real.");
        },
      }}
    >
      {children}
    </AdminSessionContext.Provider>
  );
}
