import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/shared/ProductImage";
import { formatBRL } from "@/lib/format";
import type { Category, Product } from "@/types";

export function ProductTable({
  products,
  categories,
  pending,
  onEdit,
  onToggle,
}: {
  products: Product[];
  categories: Category[];
  pending: boolean;
  onEdit: (product: Product) => void;
  onToggle: (product: Product) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Produtos do cardápio</caption>
        <thead className="border-b bg-secondary">
          <tr>
            {["Produto", "Categoria", "Preço", "Disponibilidade", "Ações"].map((label) => (
              <th key={label} scope="col" className="p-3">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const category = categories.find((c) => c.id === product.categoryId);
            return (
              <tr key={product.id} className="border-b last:border-0">
                <td className="p-3">
                  <div className="flex min-w-56 gap-3">
                    <div className="shrink-0">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-16 w-16 rounded-lg"
                      />
                      {product.imageUrl.startsWith("/images/products/") && (
                        <p className="mt-1 text-[10px] text-muted-foreground">Ilustrativa</p>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{product.name}</p>
                      <p className="line-clamp-2 text-muted-foreground">
                        {product.description || "Sem descrição"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  {category?.name ?? "Categoria não encontrada"}
                  {category && !category.active && (
                    <p className="text-xs text-destructive">Categoria inativa: venda bloqueada</p>
                  )}
                </td>
                <td className="whitespace-nowrap p-3">{formatBRL(product.priceCents)}</td>
                <td className="p-3">
                  <Badge variant={product.available ? "success" : "muted"}>
                    {product.available ? "Disponível" : "Indisponível"}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => onEdit(product)}
                      aria-label={`Editar produto ${product.name}`}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => onToggle(product)}
                      aria-label={`${product.available ? "Indisponibilizar" : "Disponibilizar"} ${product.name}`}
                    >
                      {product.available ? "Indisponibilizar" : "Disponibilizar"}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
