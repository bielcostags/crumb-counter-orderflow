import { ArrowRight, LayoutDashboard } from "lucide-react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { BrandMark } from "@/components/shared/Brand";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/contexts/AdminSessionContext";

export const Route = createFileRoute("/admin/acesso")({ component: AdminAccess });
function AdminAccess() {
  const { status, signInDemo } = useAdminSession();
  if (status === "signed-in") return <Navigate to="/admin" replace />;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <BrandMark />
      <h1 className="text-2xl font-semibold text-primary">Acesso da equipe</h1>
      <p className="text-muted-foreground">
        Acesse os pedidos, o cardápio e o atendimento no balcão em um só lugar.
      </p>
      <Button className="min-h-12 justify-between rounded-xl px-5 text-base" onClick={signInDemo}>
        <LayoutDashboard aria-hidden />
        <span>Acessar painel</span>
        <ArrowRight aria-hidden />
      </Button>
      <Button asChild variant="outline">
        <Link to="/">Voltar ao cardápio</Link>
      </Button>
    </main>
  );
}
