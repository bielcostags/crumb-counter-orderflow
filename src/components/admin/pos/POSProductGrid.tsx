import { useState } from "react";
import { usePublicCatalog } from "@/hooks/use-catalog";
import { useCounterCart } from "@/contexts/counter-cart";
import { ProductImage } from "@/components/shared/ProductImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/lib/format";
import { MAX_ITEM_QUANTITY } from "@/lib/orders";

export function POSProductGrid({ disabled }: { disabled: boolean }) {
  const catalog = usePublicCatalog();
  const { draft, add } = useCounterCart();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  if (!catalog) return null;
  const products = catalog.products.filter(
    (p) =>
      (!category || p.categoryId === category) &&
      `${p.name} ${p.description}`
        .toLocaleLowerCase("pt-BR")
        .includes(query.trim().toLocaleLowerCase("pt-BR")),
  );
  return (
    <section className="space-y-4" aria-label="Catálogo do balcão">
      <h2 className="text-lg font-semibold text-primary">Selecionar produtos</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pos-search">Pesquisar produto no balcão</Label>
          <Input
            id="pos-search"
            placeholder="Nome ou descrição"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pos-category">Categoria do balcão</Label>
          <select
            id="pos-category"
            className="h-10 w-full rounded-md border bg-card px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas as categorias ativas</option>
            {catalog.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {!products.length && (
        <p role="status" className="rounded-xl border border-dashed p-6 text-muted-foreground">
          Nenhum produto encontrado. Revise a pesquisa ou a categoria.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {products.map((product) => {
          const sellable = catalog.isSellable(product);
          const quantity = draft?.lines.find((l) => l.productId === product.id)?.quantity ?? 0;
          return (
            <article
              key={product.id}
              aria-label={`Balcão: ${product.name}`}
              className="overflow-hidden rounded-xl border bg-card"
            >
              <ProductImage
                src={product.imageUrl}
                alt={product.name}
                className="aspect-[3/2] w-full"
              />
              <div className="space-y-2 p-3">
                <h3 className="font-semibold">{product.name}</h3>
                <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
                <p className="font-semibold text-primary">{formatBRL(product.priceCents)}</p>
                <p className="text-xs text-muted-foreground">
                  {sellable ? `${quantity} selecionado(s)` : "Indisponível"}
                </p>
                <Button
                  className="min-h-11 w-full"
                  variant="caramel"
                  disabled={disabled || !sellable || quantity >= MAX_ITEM_QUANTITY}
                  onClick={() => add(product.id)}
                  aria-label={`Adicionar ${product.name} ao pedido de balcão`}
                >
                  Adicionar
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
