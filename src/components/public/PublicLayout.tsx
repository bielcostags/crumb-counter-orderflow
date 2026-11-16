import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardList, ShoppingBasket } from "lucide-react";

import { BrandMark } from "@/components/shared/Brand";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";

export function PublicLayout({ children }: { children: ReactNode }) {
  const { itemCount } = useCart();
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/" className="rounded-md text-primary" aria-label="Padaria Digital — cardápio">
            <BrandMark />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principal">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/acompanhar">
                <ClipboardList />
                Acompanhar pedido
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="sm:hidden"
              aria-label="Acompanhar pedido"
            >
              <Link to="/acompanhar">
                <ClipboardList />
              </Link>
            </Button>
            <Button asChild size="sm" className="relative">
              <Link
                to="/carrinho"
                aria-label={`Carrinho com ${itemCount} ${itemCount === 1 ? "item" : "itens"}`}
              >
                <ShoppingBasket />
                <span className="hidden sm:inline">Carrinho</span>
                {itemCount > 0 && (
                  <span className="ml-0.5 min-w-5 rounded-full bg-gold px-1.5 text-xs font-bold text-primary tabular-nums">
                    {itemCount}
                  </span>
                )}
              </Link>
            </Button>
          </nav>
        </div>
      </header>
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Padaria Digital · Protótipo de demonstração (fase 01). Dados fictícios, sem pagamentos
            reais.
          </p>
          <Link to="/admin" className="font-medium text-primary underline-offset-4 hover:underline">
            Área da equipe (demo)
          </Link>
        </div>
      </footer>
    </div>
  );
}
