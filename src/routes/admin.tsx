import { createFileRoute, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { LoadingBlock } from "@/components/shared/States";
import { useAdminSession } from "@/contexts/AdminSessionContext";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Área da equipe — Vila Rica" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { status } = useAdminSession();
  const pathname = useLocation({ select: (l) => l.pathname });
  if (status === "loading") return <LoadingBlock />;
  if (pathname === "/admin/acesso") return <Outlet />;
  if (status !== "signed-in") return <Navigate to="/admin/acesso" replace />;
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
