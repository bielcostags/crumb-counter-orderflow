import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { BrandMark } from "@/components/shared/Brand";
import { DemoNotice } from "@/components/shared/DemoNotice";
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
      <DemoNotice />
      <p>
        Não existe autenticação real. Qualquer pessoa neste navegador pode entrar no ambiente
        demonstrativo, sem senha ou credenciais.
      </p>
      <Button onClick={signInDemo}>Entrar na demonstração</Button>
      <Button asChild variant="outline">
        <Link to="/">Voltar ao cardápio</Link>
      </Button>
    </main>
  );
}
