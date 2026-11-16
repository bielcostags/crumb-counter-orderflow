import { useState, type FormEvent } from "react";
import { useStore } from "@/contexts/StoreContext";
import { categoryInputSchema } from "@/lib/catalog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Category } from "@/types";
import type { useCatalogMutation } from "./use-catalog-mutation";
import { CatalogEditor } from "./CatalogEditor";
import { CatalogFeedback } from "./CatalogFeedback";
import { CategoryDeactivateDialog } from "./CategoryDeactivateDialog";

export function CategoryForm({
  category,
  onClose,
  mutation,
}: {
  category?: Category;
  onClose: () => void;
  mutation: ReturnType<typeof useCatalogMutation>;
}) {
  const { data, services } = useStore();
  const [initial] = useState(() => ({
    name: category?.name ?? "",
    description: category?.description ?? "",
    active: category?.active ?? true,
  }));
  const [input, setInput] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  async function save() {
    const parsed = categoryInputSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])),
      );
      return;
    }
    setErrors({});
    // O serviço salva os campos e a situação atomicamente; a mesma confirmação vale para edição e ação rápida.
    if (
      await mutation.execute(
        () =>
          services.catalog.saveCategory(
            { ...parsed.data, description: parsed.data.description ?? "" },
            category?.id,
          ),
        "Categoria salva no cardápio demonstrativo.",
      )
    ) {
      setConfirm(false);
      onClose();
    } else setConfirm(false);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = categoryInputSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])),
      );
      return;
    }
    if (category?.active && !input.active) setConfirm(true);
    else void save();
  }
  return (
    <CatalogEditor
      title={category ? "Editar categoria" : "Nova categoria"}
      dirty={JSON.stringify(initial) !== JSON.stringify(input)}
      pending={mutation.pending}
      onClose={onClose}
    >
      {(close) => (
        <>
          <form onSubmit={submit} noValidate className="space-y-4" aria-busy={mutation.pending}>
            <fieldset disabled={mutation.pending} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Nome da categoria (obrigatório)</Label>
                <Input
                  id="category-name"
                  required
                  maxLength={80}
                  value={input.name}
                  onChange={(e) => setInput((v) => ({ ...v, name: e.target.value }))}
                  aria-invalid={!!errors["name"]}
                  aria-describedby="category-name-error"
                />
                <p id="category-name-error" className="text-sm text-destructive">
                  {errors["name"]}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-description">Descrição (opcional)</Label>
                <Textarea
                  id="category-description"
                  maxLength={500}
                  value={input.description}
                  onChange={(e) => setInput((v) => ({ ...v, description: e.target.value }))}
                />
              </div>
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={input.active}
                  onChange={(e) => setInput((v) => ({ ...v, active: e.target.checked }))}
                />
                Categoria ativa
              </Label>
            </fieldset>
            <CatalogFeedback mutation={mutation} />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={mutation.pending}>
                {mutation.pending ? "Salvando…" : "Salvar categoria"}
              </Button>
              <Button type="button" variant="outline" disabled={mutation.pending} onClick={close}>
                Cancelar
              </Button>
            </div>
          </form>
          <CategoryDeactivateDialog
            open={confirm}
            count={data?.products.filter((p) => p.categoryId === category?.id).length ?? 0}
            pending={mutation.pending}
            onClose={() => setConfirm(false)}
            onConfirm={() => void save()}
          />
        </>
      )}
    </CatalogEditor>
  );
}
