import { StaffLogin } from "@/components/admin/auth/StaffLogin";
import { isRealAuth } from "@/services/auth/config";
import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { BrandMark } from "@/components/shared/Brand";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/contexts/AdminSessionContext";

export const Route = createFileRoute("/admin/acesso")({
  component: () => (isRealAuth() ? <StaffLogin /> : <AdminAccess />),
});
function AdminAccess() {
  const { status, signInDemo, demoIdentity } = useAdminSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      signInDemo(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }
  if (status === "signed-in")
    return (
      <Navigate to={demoIdentity?.role === "funcionario" ? "/admin/pedidos" : "/admin"} replace />
    );
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <BrandMark />
      <h1 className="text-2xl font-semibold text-primary">Acesso da equipe</h1>
      <p className="text-muted-foreground">
        Acesse os pedidos, o cardápio e o atendimento no balcão em um só lugar.
      </p>
      <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
        <div className="space-y-2">
          <Label htmlFor="demo-email">E-mail</Label>
          <Input
            id="demo-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="demo-password">Senha</Label>
          <div className="flex gap-2">
            <Input
              id="demo-password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={visible}
              onClick={() => setVisible((v) => !v)}
            >
              {visible ? <EyeOff /> : <Eye />}
            </Button>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="min-h-12 w-full">
          {busy ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      <details className="rounded-xl border bg-card p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Contas para apresentação</summary>
        <p className="mt-3 break-all">
          Administrador: admin@vilarica.demo
          <br />
          Senha: Admin@Demo2026
        </p>
        <p className="mt-3 break-all">
          Funcionário: funcionario@vilarica.demo
          <br />
          Senha: Funcionario@Demo2026
        </p>
        <p className="mt-3 text-muted-foreground">
          Credenciais públicas e fictícias. Acesso local para apresentação acadêmica.
        </p>
      </details>
      <Button asChild variant="outline">
        <Link to="/">Voltar ao cardápio</Link>
      </Button>
    </main>
  );
}
