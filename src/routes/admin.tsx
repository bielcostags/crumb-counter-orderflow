import { createFileRoute, Navigate, Outlet, useLocation, redirect } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { LoadingBlock } from "@/components/shared/States";
import { isRealAuth } from "@/services/auth/config";
import { mayAccess, permissionForPath } from "@/services/auth/policy";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/contexts/AdminSessionContext";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    if (!isRealAuth() || location.pathname === "/admin/acesso") return;
    const { currentStaff } = await import("@/services/auth/functions");
    const session = await currentStaff();
    if (!session.profile) throw redirect({ to: "/admin/acesso" });
    if (!mayAccess(session.profile, permissionForPath(location.pathname)))
      throw new Error("Acesso não autorizado.");
  },
  head: () => ({
    meta: [{ title: "Área da equipe — Vila Rica" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { status, mode, profile, refresh, signOut } = useAdminSession();
  const pathname = useLocation({ select: (l) => l.pathname });
  if (mode === "supabase" && pathname === "/admin/acesso") return <Outlet />;
  if (status === "loading") return <LoadingBlock />;
  if (pathname === "/admin/acesso") return <Outlet />;
  if (mode === "supabase" && (status === "error" || status === "denied"))
    return (
      <main className="mx-auto max-w-md space-y-4 p-6">
        <h1>Acesso indisponível</h1>
        <p role="alert">
          Não foi possível autorizar este acesso. Confira sua sessão e seu perfil com o
          administrador.
        </p>
        <Button onClick={() => void refresh()}>Verificar novamente</Button>
        <Button variant="outline" onClick={() => void signOut()}>
          Sair
        </Button>
      </main>
    );
  if (status !== "signed-in") return <Navigate to="/admin/acesso" replace />;
  if (mode === "supabase") {
    if (!mayAccess(profile, permissionForPath(pathname)))
      return (
        <main className="p-6" role="alert">
          Acesso não autorizado.
        </main>
      );
    return (
      <AdminLayout>
        {pathname === "/admin/funcionarios" ? (
          <Outlet />
        ) : (
          <section className="space-y-3">
            <h1 className="font-display text-2xl text-primary">Área autenticada</h1>
            <p>Acesso verificado para {profile?.full_name}.</p>
            <p>
              Pedidos, catálogo, indicadores e PDV remotos ainda não foram liberados. Nenhum dado
              demonstrativo é exibido nesta área.
            </p>
          </section>
        )}
      </AdminLayout>
    );
  }
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
