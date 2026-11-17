import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike, Search, SearchX, ShoppingBag, ShoppingBasket, Wallet, X } from "lucide-react";

import { ProductCard } from "@/components/public/ProductCard";
import { PublicLayout } from "@/components/public/PublicLayout";
import { BrandLogo } from "@/components/shared/Brand";
import { EmptyState, LoadingGrid } from "@/components/shared/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import { usePublicCatalog } from "@/hooks/use-catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cardápio — Vila Rica" },
      {
        name: "description",
        content: "Vila Rica — lanches, sanduíches, tapiocas, cuscuz, cafés e sucos.",
      },
      { property: "og:title", content: "Cardápio — Vila Rica" },
      {
        property: "og:description",
        content: "Vila Rica — lanches, sanduíches, tapiocas, cuscuz, cafés e sucos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MenuPage,
});

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function MenuPage() {
  const catalog = usePublicCatalog();
  const { itemCount } = useCart();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | "all">("all");

  const sections = useMemo(() => {
    if (!catalog) return [];
    const q = normalize(query);
    return catalog.categories
      .filter((c) => categoryId === "all" || c.id === categoryId)
      .map((c) => ({
        category: c,
        products: catalog.products.filter(
          (p) =>
            p.categoryId === c.id &&
            (!q || normalize(p.name).includes(q) || normalize(p.description).includes(q)),
        ),
      }))
      .filter((s) => s.products.length > 0);
  }, [catalog, query, categoryId]);

  return (
    <PublicLayout>
      <section className="border-b bg-card">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[1.1fr_1fr] md:items-center md:py-10">
          <div className="order-2 md:order-1">
            <p className="text-sm font-medium text-caramel">Vila Rica Artesanal</p>
            <h1 className="mt-1 text-3xl font-semibold leading-tight text-primary md:text-4xl">
              Padaria e Confeitaria Artesanal
            </h1>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4 text-success" aria-hidden />
                Retirada no balcão
              </li>
              <li className="flex items-center gap-1.5">
                <Bike className="h-4 w-4 text-success" aria-hidden />
                Entrega na região
              </li>
              <li className="flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-success" aria-hidden />
                Pague ao receber
              </li>
            </ul>
          </div>
          <aside
            aria-label="Apresentação Vila Rica"
            className="order-1 flex items-center justify-center rounded-xl border bg-background p-4 md:order-2"
          >
            <BrandLogo className="h-auto max-h-72 w-full max-w-sm" />
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-28 pt-6">
        <div className="sticky top-16 z-20 -mx-4 space-y-3 bg-background/95 px-4 py-3 backdrop-blur">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar no cardápio (ex.: X-Bacon)"
              aria-label="Buscar produtos"
              className="h-11 bg-card pl-9 pr-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div
            className="scrollbar-thin -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
            role="group"
            aria-label="Filtrar por categoria"
          >
            {[{ id: "all", name: "Todos" }, ...(catalog?.categories ?? [])].map((c) => {
              const active = categoryId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategoryId(c.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card text-foreground hover:bg-accent",
                  )}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {!catalog ? (
          <LoadingGrid className="mt-4" />
        ) : sections.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={SearchX}
            title={
              catalog.products.length === 0
                ? "Cardápio vazio no momento"
                : "Nenhum produto encontrado"
            }
            description={
              catalog.products.length === 0
                ? "Nenhuma categoria ativa com produtos. Volte mais tarde."
                : "Tente outro termo ou escolha outra categoria."
            }
            action={
              (query || categoryId !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setCategoryId("all");
                  }}
                >
                  Limpar filtros
                </Button>
              )
            }
          />
        ) : (
          <div className="mt-4 space-y-10">
            {sections.map(({ category, products }) => (
              <section key={category.id} aria-labelledby={`cat-${category.id}`}>
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <h2 id={`cat-${category.id}`} className="text-xl font-semibold text-primary">
                    {category.name}
                  </h2>
                  {category.description && (
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} sellable={catalog.isSellable(p)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card p-3 shadow-card md:hidden">
          <Button asChild size="xl" className="w-full">
            <Link to="/carrinho">
              <ShoppingBasket />
              Ver carrinho ({itemCount} {itemCount === 1 ? "item" : "itens"})
            </Link>
          </Button>
        </div>
      )}
    </PublicLayout>
  );
}
