import { useState, type FormEvent } from "react";
import { useStore } from "@/contexts/StoreContext";
import { productInputSchema, canAssignCategory } from "@/lib/catalog";
import { centsToInput, parseBRLToCents } from "@/lib/format";
import { PRODUCT_IMAGE_GALLERY } from "@/data/mock";
import { ProductImage } from "@/components/shared/ProductImage";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types";
import type { useCatalogMutation } from "./use-catalog-mutation";
import { CatalogEditor } from "./CatalogEditor";
import { CatalogFeedback } from "./CatalogFeedback";

export function ProductForm({
  product,
  onClose,
  mutation,
}: {
  product?: Product;
  onClose: () => void;
  mutation: ReturnType<typeof useCatalogMutation>;
}) {
  const { data, services } = useStore();
  const [initial] = useState(() => ({
    name: product?.name ?? "",
    description: product?.description ?? "",
    categoryId: product?.categoryId ?? data?.categories.find((c) => c.active)?.id ?? "",
    price: product ? centsToInput(product.priceCents) : "",
    imageUrl: product?.imageUrl ?? "",
    available: product?.available ?? true,
  }));
  const [input, setInput] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const update = (key: keyof typeof input, value: string | boolean) =>
    setInput((prev) => ({ ...prev, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = productInputSchema.safeParse({
      ...input,
      priceCents: parseBRLToCents(input.price),
    });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])),
      );
      return;
    }
    if (!canAssignCategory(data?.categories ?? [], parsed.data.categoryId, product)) {
      setErrors({ categoryId: "Selecione uma categoria ativa." });
      return;
    }
    setErrors({});
    if (
      await mutation.execute(
        () => services.catalog.saveProduct(parsed.data, product?.id),
        "Produto salvo no cardápio demonstrativo.",
      )
    )
      onClose();
  }
  const currentCategory = data?.categories.find((c) => c.id === product?.categoryId);
  return (
    <CatalogEditor
      title={product ? "Editar produto" : "Novo produto"}
      dirty={JSON.stringify(input) !== JSON.stringify(initial)}
      pending={mutation.pending}
      onClose={onClose}
    >
      {(close) => (
        <form onSubmit={submit} noValidate className="space-y-4" aria-busy={mutation.pending}>
          <fieldset disabled={mutation.pending} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">Nome do produto (obrigatório)</Label>
              <Input
                id="product-name"
                required
                maxLength={80}
                value={input.name}
                onChange={(e) => update("name", e.target.value)}
                aria-invalid={!!errors["name"]}
                aria-describedby="product-name-error"
              />
              <p
                id="product-name-error"
                role={errors["name"] ? "alert" : undefined}
                className="text-sm text-destructive"
              >
                {errors["name"]}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-description">Descrição</Label>
              <Textarea
                id="product-description"
                maxLength={500}
                value={input.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-category">Categoria (obrigatória)</Label>
              <select
                id="product-category"
                required
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={input.categoryId}
                onChange={(e) => update("categoryId", e.target.value)}
                aria-invalid={!!errors["categoryId"]}
              >
                <option value="">Selecione</option>
                {data?.categories
                  .filter((c) => c.active || c.id === product?.categoryId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {!c.active ? " (inativa atual)" : ""}
                    </option>
                  ))}
              </select>
              {currentCategory && !currentCategory.active && (
                <p className="text-sm text-muted-foreground">
                  Este produto está em categoria inativa. Pode mantê-la na edição; para transferir,
                  selecione uma categoria ativa. Não será vendido enquanto a categoria estiver
                  inativa.
                </p>
              )}
              {errors["categoryId"] && (
                <p role="alert" className="text-sm text-destructive">
                  {errors["categoryId"]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-price">Preço de venda em R$ (obrigatório)</Label>
              <Input
                id="product-price"
                inputMode="decimal"
                required
                value={input.price}
                onChange={(e) => update("price", e.target.value)}
                placeholder="Ex.: 12,50"
                aria-invalid={!!errors["priceCents"]}
                aria-describedby="product-price-error"
              />
              <p
                id="product-price-error"
                role={errors["priceCents"] ? "alert" : undefined}
                className="text-sm text-destructive"
              >
                {errors["priceCents"]}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-gallery">Imagem do projeto</Label>
              <select
                id="product-gallery"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={
                  PRODUCT_IMAGE_GALLERY.some((i) => i.url === input.imageUrl) ? input.imageUrl : ""
                }
                onChange={(e) => update("imageUrl", e.target.value)}
              >
                <option value="">Sem imagem / usar URL abaixo</option>
                {PRODUCT_IMAGE_GALLERY.map((image) => (
                  <option key={image.url} value={image.url}>
                    {image.label}
                  </option>
                ))}
              </select>
              <Label htmlFor="product-image">Imagem local ou URL HTTPS</Label>
              <Input
                id="product-image"
                value={input.imageUrl}
                maxLength={2048}
                onChange={(e) => update("imageUrl", e.target.value)}
                placeholder="https://... ou selecione uma imagem acima"
                aria-invalid={!!errors["imageUrl"]}
              />
              {errors["imageUrl"] && (
                <p role="alert" className="text-sm text-destructive">
                  {errors["imageUrl"]}
                </p>
              )}
              <ProductImage
                src={input.imageUrl}
                alt={input.name || "Prévia do produto"}
                className="h-32 w-40 rounded-lg"
              />
              <p className="text-xs text-muted-foreground">
                Sem upload. Fotos da galeria são ilustrativas, não imagens oficiais da Vila Rica.
                URLs remotas dependem dos servidores de origem; falhas exibem uma imagem padrão.
              </p>
            </div>
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={input.available}
                onChange={(e) => update("available", e.target.checked)}
              />
              Produto disponível
            </Label>
          </fieldset>
          <CatalogFeedback mutation={mutation} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={mutation.pending}>
              {mutation.pending ? "Salvando…" : "Salvar produto"}
            </Button>
            <Button type="button" variant="outline" disabled={mutation.pending} onClick={close}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </CatalogEditor>
  );
}
