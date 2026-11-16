import { useState } from "react";
import { Tags } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingBlock } from "@/components/shared/States";
import type { Category } from "@/types";
import { CategoryTable } from "./CategoryTable";
import { CategoryForm } from "./CategoryForm";
import { CategoryDeactivateDialog } from "./CategoryDeactivateDialog";
import { CatalogFeedback } from "./CatalogFeedback";
import { useCatalogMutation } from "./use-catalog-mutation";

export function AdminCategories() {
  const { data, services } = useStore();
  const mutation = useCatalogMutation();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  if (!data) return <LoadingBlock />;
  const categories = data.categories
    .filter(
      (c) =>
        (!query.trim() ||
          c.name.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"))) &&
        (!status || c.active === (status === "active")),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
  function edit(category: Category | "new") {
    mutation.clearFeedback();
    setEditing(category);
  }
  async function toggle(category: Category) {
    if (category.active) {
      mutation.clearFeedback();
      setDeactivating(category.id);
    } else
      await mutation.execute(
        () => services.catalog.setCategoryActive(category.id, true),
        "Categoria reativada.",
      );
  }
  async function deactivate() {
    if (!deactivating) return;
    if (
      await mutation.execute(
        () => services.catalog.setCategoryActive(deactivating, false),
        "Categoria desativada. Produtos e pedidos preservados.",
      )
    )
      setDeactivating(null);
    else setDeactivating(null);
  }
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Categorias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize o cardápio sem excluir produtos ou pedidos históricos.
          </p>
        </div>
        <Button disabled={mutation.pending} onClick={() => edit("new")}>
          Nova categoria
        </Button>
      </div>
      <section
        className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-3"
        aria-label="Filtros de categorias"
      >
        <div className="space-y-2">
          <Label htmlFor="category-query">Pesquisar categoria</Label>
          <Input id="category-query" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category-filter-status">Situação</Label>
          <select
            id="category-filter-status"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="active">Ativas</option>
            <option value="inactive">Inativas</option>
          </select>
        </div>
        <Button
          className="self-end"
          variant="outline"
          onClick={() => {
            setQuery("");
            setStatus("");
          }}
        >
          Limpar filtros
        </Button>
      </section>
      <p role="status" className="text-sm text-muted-foreground">
        {categories.length} categoria(s) encontrada(s)
      </p>
      <p className="text-xs text-muted-foreground">
        A contagem de produtos disponíveis considera a marcação individual; categorias inativas
        bloqueiam todas as vendas.
      </p>
      {!editing && <CatalogFeedback mutation={mutation} />}
      {categories.length ? (
        <CategoryTable
          categories={categories}
          products={data.products}
          pending={mutation.pending}
          onEdit={edit}
          onToggle={(c) => void toggle(c)}
        />
      ) : (
        <EmptyState
          icon={Tags}
          title="Nenhuma categoria encontrada"
          description="Cadastre uma categoria ou revise os filtros."
        />
      )}
      {editing && (
        <CategoryForm
          {...(editing === "new" ? {} : { category: editing })}
          mutation={mutation}
          onClose={() => setEditing(null)}
        />
      )}
      <CategoryDeactivateDialog
        open={!!deactivating}
        count={data.products.filter((p) => p.categoryId === deactivating).length}
        pending={mutation.pending}
        onClose={() => setDeactivating(null)}
        onConfirm={() => void deactivate()}
      />
    </>
  );
}
