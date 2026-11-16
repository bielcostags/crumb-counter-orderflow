import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingBlock } from "@/components/shared/States";
import type { Product } from "@/types";
import { ProductTable } from "./ProductTable";
import { ProductForm } from "./ProductForm";
import { CatalogFeedback } from "./CatalogFeedback";
import { useCatalogMutation } from "./use-catalog-mutation";

const empty = { query: "", category: "", availability: "", sort: "name-asc" };
export function AdminProducts() {
  const { data, services } = useStore();
  const mutation = useCatalogMutation();
  const [filters, setFilters] = useState(empty);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  if (!data) return <LoadingBlock />;
  const query = filters.query.trim().toLocaleLowerCase("pt-BR");
  const products = data.products
    .filter(
      (p) =>
        (!query || `${p.name} ${p.description}`.toLocaleLowerCase("pt-BR").includes(query)) &&
        (!filters.category || p.categoryId === filters.category) &&
        (!filters.availability || p.available === (filters.availability === "available")),
    )
    .sort((a, b) =>
      filters.sort.startsWith("name")
        ? a.name.localeCompare(b.name, "pt-BR") * (filters.sort === "name-desc" ? -1 : 1)
        : (a.priceCents - b.priceCents) * (filters.sort === "price-desc" ? -1 : 1),
    );
  const hasActive = data.categories.some((c) => c.active);
  function edit(product: Product | "new") {
    mutation.clearFeedback();
    setEditing(product);
  }
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie o cardápio demonstrativo. Disponibilidade não representa estoque.
          </p>
        </div>
        <Button disabled={!hasActive || mutation.pending} onClick={() => edit("new")}>
          Novo produto
        </Button>
      </div>
      {!hasActive && (
        <p role="status" className="rounded-xl border border-gold bg-gold-soft p-4">
          Cadastre ou reative uma categoria antes de cadastrar produtos.{" "}
          <Link to="/admin/categorias" className="text-primary underline">
            Gerenciar categorias
          </Link>
        </p>
      )}
      <section
        className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Filtros de produtos"
      >
        <div className="space-y-2">
          <Label htmlFor="product-query">Pesquisar nome ou descrição</Label>
          <Input
            id="product-query"
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-filter-category">Categoria</Label>
          <select
            id="product-filter-category"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={filters.category}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">Todas</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {!c.active ? " (inativa)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-filter-availability">Disponibilidade</Label>
          <select
            id="product-filter-availability"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={filters.availability}
            onChange={(e) => setFilters((f) => ({ ...f, availability: e.target.value }))}
          >
            <option value="">Todas</option>
            <option value="available">Disponíveis</option>
            <option value="unavailable">Indisponíveis</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-sort">Ordenar produtos</Label>
          <select
            id="product-sort"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
          >
            <option value="name-asc">Nome A–Z</option>
            <option value="name-desc">Nome Z–A</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
          </select>
        </div>
        <Button variant="outline" onClick={() => setFilters(empty)}>
          Limpar filtros
        </Button>
      </section>
      <p role="status" className="text-sm text-muted-foreground">
        {products.length} produto(s) encontrado(s)
      </p>
      {!editing && <CatalogFeedback mutation={mutation} />}
      {products.length ? (
        <ProductTable
          products={products}
          categories={data.categories}
          pending={mutation.pending}
          onEdit={edit}
          onToggle={(p) =>
            void mutation.execute(
              () => services.catalog.setProductAvailable(p.id, !p.available),
              p.available ? "Produto indisponibilizado." : "Produto disponibilizado.",
            )
          }
        />
      ) : (
        <EmptyState
          icon={ShoppingBag}
          title="Nenhum produto encontrado"
          description="Cadastre um produto ou revise os filtros."
        />
      )}
      {editing && (
        <ProductForm
          {...(editing === "new" ? {} : { product: editing })}
          mutation={mutation}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
