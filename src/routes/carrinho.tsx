import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBasket, Trash2 } from "lucide-react";

import { PublicLayout } from "@/components/public/PublicLayout";
import { QuantityStepper } from "@/components/shared/QuantityStepper";
import { EmptyState, LoadingBlock } from "@/components/shared/States";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { usePublicCatalog } from "@/hooks/use-catalog";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho — Padaria Digital" },
      {
        name: "description",
        content: "Revise itens, quantidades e observações do seu pedido (demonstração).",
      },
      { property: "og:title", content: "Carrinho — Padaria Digital" },
      {
        property: "og:description",
        content: "Revise itens, quantidades e observações do seu pedido.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const catalog = usePublicCatalog();
  const { lines, setQuantity, setNotes, removeItem } = useCart();

  if (!catalog || !lines)
    return (
      <PublicLayout>
        <LoadingBlock />
      </PublicLayout>
    );

  const rows = lines.map((l) => ({ line: l, product: catalog.productById(l.productId) }));
  const total = rows.reduce(
    (s, r) => s + (r.product ? r.product.priceCents * r.line.quantity : 0),
    0,
  );

  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-primary">Seu carrinho</h1>
        {rows.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={ShoppingBasket}
            title="Seu carrinho está vazio"
            description="Adicione produtos do cardápio para fazer um pedido."
            action={
              <Button asChild>
                <Link to="/">Ver cardápio</Link>
              </Button>
            }
          />
        ) : (
          <>
            <ul className="mt-6 space-y-3">
              {rows.map(({ line, product }) => (
                <li key={line.productId} className="rounded-xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{product?.name ?? "Produto removido"}</p>
                      {product && (
                        <p className="text-sm text-muted-foreground">
                          {formatBRL(product.priceCents)} cada
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(line.productId)}
                      aria-label="Remover item"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <QuantityStepper
                      value={line.quantity}
                      onChange={(q) => setQuantity(line.productId, q)}
                      label={product?.name ?? "item"}
                    />
                    <p className="font-semibold tabular-nums">
                      {product ? formatBRL(product.priceCents * line.quantity) : "—"}
                    </p>
                  </div>
                  <Textarea
                    className="mt-3"
                    placeholder="Observações do item (opcional)"
                    aria-label="Observações do item"
                    value={line.notes ?? ""}
                    onChange={(e) => setNotes(line.productId, e.target.value)}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center justify-between rounded-xl border bg-card p-4">
              <span className="font-medium">Total</span>
              <span className="font-display text-xl font-semibold text-primary tabular-nums">
                {formatBRL(total)}
              </span>
            </div>
            <Button asChild className="mt-4">
              <Link to="/checkout">Finalizar pedido</Link>
            </Button>
          </>
        )}
      </div>
    </PublicLayout>
  );
}
