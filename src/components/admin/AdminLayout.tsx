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
  const section = pathname.endsWith("balcao")
    ? "Atendimento no balcão"
    : pathname.endsWith("produtos")
      ? "Produtos"
      : pathname.endsWith("categorias")
        ? "Categorias"
        : pathname.endsWith("pedidos")
          ? "Gerenciamento de pedidos"
          : "Visão geral";
  const overview = section === "Visão geral";
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
          <Button asChild variant={overview ? "secondary" : "ghost"}>
            <Link to="/admin" aria-label="Visão geral" aria-current={overview ? "page" : undefined}>
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
              { to: "/admin/produtos", label: "Produtos", Icon: ShoppingBag },
              { to: "/admin/categorias", label: "Categorias", Icon: Tags },
              { to: "/admin/balcao", label: "Atendimento no balcão", Icon: Store },
            ] as const
          ).map(({ to, label, Icon }) => (
            <Button key={to} asChild variant={section === label ? "secondary" : "ghost"}>
              <Link
                to={to}
                aria-label={label}
                aria-current={section === label ? "page" : undefined}
              >
                <Icon />
                {expanded && label}
              </Link>
            </Button>
          ))}
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
            <p className="font-display font-semibold text-primary">{section}</p>
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
