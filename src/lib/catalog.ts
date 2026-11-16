import { z } from "zod";
import { PRODUCT_IMAGE_GALLERY } from "@/data/mock";
import type { Category, Product } from "@/types";

export const cleanCatalogText = (value: string) => value.trim().replace(/\s+/g, " ");
/** Somente imagens locais conhecidas, vazio (fallback) ou URL HTTPS sem credenciais. */
export function isValidProductImage(value: string): boolean {
  if (!value || PRODUCT_IMAGE_GALLERY.some((image) => image.url === value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}
const name = z
  .string()
  .transform(cleanCatalogText)
  .pipe(
    z.string().min(2, "Informe um nome com ao menos 2 caracteres.").max(80, "Nome muito longo."),
  );
export const categoryInputSchema = z.object({
  name,
  description: z.string().trim().max(500, "Descrição muito longa.").optional(),
  active: z.boolean(),
});
export const productInputSchema = z.object({
  name,
  description: z.string().trim().max(500, "Descrição muito longa."),
  categoryId: z.string().min(1, "Selecione uma categoria."),
  priceCents: z
    .number({ invalid_type_error: "Informe um preço válido em reais." })
    .refine(
      (value) => Number.isSafeInteger(value) && value > 0,
      "Informe um preço válido, maior que zero e dentro do limite seguro.",
    ),
  imageUrl: z
    .string()
    .trim()
    .max(2048, "URL muito longa.")
    .refine(
      isValidProductImage,
      "Use uma imagem do projeto ou uma URL HTTPS válida, sem credenciais.",
    ),
  available: z.boolean(),
});
/** Edição na categoria inativa atual é permitida; criação e transferências exigem ativa. */
export function canAssignCategory(
  categories: Category[],
  categoryId: string,
  current?: Product,
): boolean {
  const category = categories.find((c) => c.id === categoryId);
  return !!category && (category.active || current?.categoryId === categoryId);
}
