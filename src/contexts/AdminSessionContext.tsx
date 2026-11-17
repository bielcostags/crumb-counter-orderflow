import { lazy, Suspense, useSyncExternalStore, type ReactNode } from "react";
import { AdminSessionContext } from "./admin-session";
import { LoadingBlock } from "@/components/shared/States";
const StaffSessionProvider = lazy(() =>
  import("./StaffSessionContext").then((module) => ({ default: module.StaffSessionProvider })),
);
import { isRealAuth } from "@/services/auth/config";
export { useAdminSession } from "./admin-session";

import { adminSessionStore } from "@/services/local/store";

const getServerSnapshot = () => null;

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  return isRealAuth() ? (
    <Suspense fallback={<LoadingBlock />}>
      <StaffSessionProvider>{children}</StaffSessionProvider>
    </Suspense>
  ) : (
    <DemoSessionProvider>{children}</DemoSessionProvider>
  );
}
function DemoSessionProvider({ children }: { children: ReactNode }) {
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
        mode: "demo",
        profile: null,
        error: "",
        signIn: async () => {
          throw new Error("Login real não habilitado no modo demonstrativo.");
        },
        refresh: () => {},
        signInDemo: () => adminSessionStore.set({ signedIn: true, mode: "demo" }),
        signOut: () => adminSessionStore.set({ signedIn: false, mode: "demo" }),
      }}
    >
      {children}
    </AdminSessionContext.Provider>
  );
}
