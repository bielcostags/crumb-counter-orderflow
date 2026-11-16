import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Category, Product } from "@/types";

export function CategoryTable({
  categories,
  products,
  pending,
  onEdit,
  onToggle,
}: {
  categories: Category[];
  products: Product[];
  pending: boolean;
  onEdit: (category: Category) => void;
  onToggle: (category: Category) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Categorias do cardápio</caption>
        <thead className="border-b bg-secondary">
          <tr>
            {["Categoria", "Produtos vinculados", "Produtos disponíveis", "Situação", "Ações"].map(
              (label) => (
                <th scope="col" key={label} className="p-3">
                  {label}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => {
            const linked = products.filter((p) => p.categoryId === category.id);
            return (
              <tr key={category.id} className="border-b last:border-0">
                <td className="min-w-48 p-3">
                  <p className="font-semibold">{category.name}</p>
                  <p className="text-muted-foreground">{category.description || "Sem descrição"}</p>
                </td>
                <td className="p-3">{linked.length}</td>
                <td className="p-3">
                  {linked.filter((p) => p.available).length}
                  <span className="sr-only"> individualmente disponíveis</span>
                </td>
                <td className="p-3">
                  <Badge variant={category.active ? "success" : "muted"}>
                    {category.active ? "Ativa" : "Inativa"}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => onEdit(category)}
                      aria-label={`Editar categoria ${category.name}`}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => onToggle(category)}
                      aria-label={`${category.active ? "Desativar" : "Ativar"} categoria ${category.name}`}
                    >
                      {category.active ? "Desativar" : "Ativar"}
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
