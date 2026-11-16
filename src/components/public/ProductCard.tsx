import { Check, Plus } from "lucide-react";
import { toast } from "sonner";

import { ProductImage } from "@/components/shared/ProductImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { formatBRL } from "@/lib/format";
import type { Product } from "@/types";

export function ProductCard({ product, sellable }: { product: Product; sellable: boolean }) {
  const { lines, addItem } = useCart();
  const inCart = lines?.find((l) => l.productId === product.id)?.quantity ?? 0;

  return (
    <article
      className="group flex overflow-hidden rounded-xl border bg-card shadow-soft sm:flex-col"
      aria-label={product.name}
    >
      <div className="relative w-28 shrink-0 sm:w-full">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className={`h-full w-full sm:aspect-[4/3] sm:h-auto ${sellable ? "" : "opacity-60 grayscale-[40%]"}`}
        />
        {!sellable && (
          <Badge variant="muted" className="absolute left-2 top-2 hidden bg-card/95 sm:inline-flex">
            Indisponível
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <div>
          <h3 className="text-[0.95rem] font-semibold leading-snug sm:text-base">{product.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div>
            <p className="font-display text-base font-semibold text-primary tabular-nums">
              {formatBRL(product.priceCents)}
            </p>
            {sellable ? (
              <p className="text-xs text-success">Disponível</p>
            ) : (
              <p className="text-xs text-muted-foreground">Indisponível no momento</p>
            )}
          </div>
          <Button
            size="sm"
            variant={inCart ? "secondary" : "caramel"}
            disabled={!sellable}
            onClick={() => {
              addItem(product.id);
              toast.success(`${product.name} adicionado ao carrinho`);
            }}
            aria-label={
              sellable ? `Adicionar ${product.name} ao carrinho` : `${product.name} indisponível`
            }
          >
            {inCart ? <Check /> : <Plus />}
            {sellable ? (inCart ? `${inCart} no carrinho` : "Adicionar") : "Indisponível"}
          </Button>
        </div>
      </div>
    </article>
  );
}
