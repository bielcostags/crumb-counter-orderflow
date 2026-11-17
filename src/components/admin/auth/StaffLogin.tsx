import { useState, useRef, type FormEvent } from "react";
import { Navigate, Link } from "@tanstack/react-router";
import { useAdminSession } from "@/contexts/admin-session";
import { BrandMark } from "@/components/shared/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginSchema } from "@/services/auth/policy";
export function StaffLogin() {
  const { status, signIn, signOut, error } = useAdminSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validation, setValidation] = useState("");
  const busy = useRef(false);
  if (status === "signed-in") return <Navigate to="/admin" replace />;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy.current) return;
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setValidation("Informe um e-mail válido e sua senha.");
      return;
    }
    busy.current = true;
    setValidation("");
    try {
      await signIn(parsed.data.email, parsed.data.password);
    } finally {
      setPassword("");
      busy.current = false;
    }
  };
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <BrandMark />
      <h1 className="text-2xl font-semibold text-primary">Acesso da equipe</h1>
      <form className="space-y-4" onSubmit={submit}>
        <label className="block space-y-2">
          E-mail
          <Input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={254}
          />
        </label>
        <label className="block space-y-2">
          Senha
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            maxLength={256}
          />
        </label>
        {(validation || error || status === "denied") && (
          <p role="alert">
            {validation ||
              error ||
              "Seu acesso operacional não foi autorizado. Consulte o administrador."}
          </p>
        )}
        <Button className="min-h-12 w-full" disabled={status === "loading"} type="submit">
          {status === "loading" ? "Verificando acesso…" : "Entrar"}
        </Button>
      </form>
      {(status === "denied" || status === "error") && (
        <Button variant="outline" onClick={() => void signOut()}>
          Sair da sessão
        </Button>
      )}
      <Button asChild variant="outline">
        <Link to="/">Voltar ao cardápio</Link>
      </Button>
    </main>
  );
}
