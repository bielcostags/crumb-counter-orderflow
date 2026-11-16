import { useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Menu,
  LayoutDashboard,
  ClipboardList,
  LogOut,
  ShoppingBag,
  Tags,
  Store,
} from "lucide-react";
import { BrandMark } from "@/components/shared/Brand";
import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/contexts/AdminSessionContext";
import { useAdminClock } from "./use-admin-clock";

export function AdminLayout({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  const { signOut } = useAdminSession();
  const pathname = useLocation({ select: (l) => l.pathname });
  const now = useAdminClock();
  return (
    <div className="min-h-screen md:flex">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-3"
      >
        Pular para o conteúdo
      </a>
      <aside
        className={`${expanded ? "md:w-64" : "md:w-20"} shrink-0 border-b bg-card md:min-h-screen md:border-r transition-[width]`}
      >
        <div className="flex items-center justify-between gap-2 p-4">
          <span className={expanded ? "" : "hidden"}>
            <BrandMark />
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Recolher menu" : "Expandir menu"}
            aria-expanded={expanded}
            aria-controls="admin-navigation"
          >
            <Menu />
          </Button>
        </div>
        <nav
          id="admin-navigation"
          className={`${expanded ? "flex" : "hidden md:flex"} flex-col gap-2 p-3`}
          aria-label="Área administrativa"
        >
          <Button asChild variant={pathname.endsWith("pedidos") ? "ghost" : "secondary"}>
            <Link
              to="/admin"
              aria-label="Visão geral"
              aria-current={!pathname.endsWith("pedidos") ? "page" : undefined}
            >
              <LayoutDashboard />
              {expanded && "Visão geral"}
            </Link>
          </Button>
          <Button asChild variant={pathname.endsWith("pedidos") ? "secondary" : "ghost"}>
            <Link
              to="/admin/pedidos"
              aria-label="Pedidos"
              aria-current={pathname.endsWith("pedidos") ? "page" : undefined}
            >
              <ClipboardList />
              {expanded && "Pedidos"}
            </Link>
          </Button>
          {(
            [
              [ShoppingBag, "Produtos"],
              [Tags, "Categorias"],
              [Store, "Atendimento no balcão"],
            ] as const
          ).map(([Symbol, label]) => {
            return (
              <div
                key={String(label)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground"
                aria-label={`${label}: em breve`}
              >
                <Symbol className="h-4 w-4 shrink-0" aria-hidden />
                {expanded && (
                  <span>
                    {String(label)} <span className="block text-xs">Em breve</span>
                  </span>
                )}
              </div>
            );
          })}
          <Button asChild variant="outline">
            <Link to="/" aria-label="Voltar ao cardápio">
              <ShoppingBag />
              {expanded && "Voltar ao cardápio"}
            </Link>
          </Button>
          <Button variant="ghost" onClick={signOut} aria-label="Sair">
            <LogOut />
            {expanded && "Sair"}
          </Button>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-card px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-caramel">
              Padaria Digital · Ambiente demonstrativo · Equipe
            </p>
            <p className="font-display font-semibold text-primary">
              {pathname.endsWith("pedidos") ? "Gerenciamento de pedidos" : "Visão geral"}
            </p>
          </div>
          <time dateTime={now.toISOString()} className="text-sm text-muted-foreground">
            {now.toLocaleDateString("pt-BR", { dateStyle: "full" })}
          </time>
        </header>
        <main id="admin-content" className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
