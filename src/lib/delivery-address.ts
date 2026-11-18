import { z } from "zod";
import { onlyDigits } from "./format";
export const deliveryAddressSchema = z.object({
  cep: z.string().refine((v) => /^\d{8}$/.test(onlyDigits(v)), "Informe o CEP com oito dígitos."),
  street: z.string().trim().min(2, "Informe a rua/logradouro.").max(70),
  number: z.string().trim().min(1, "Informe o número.").max(10),
  district: z.string().trim().min(2, "Informe o bairro.").max(40),
  city: z.string().trim().min(2, "Informe a cidade.").max(40),
  uf: z
    .string()
    .regex(
      /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/,
      "Informe uma UF válida.",
    ),
  complement: z.string().trim().max(40),
});
export type DeliveryAddress = z.infer<typeof deliveryAddressSchema>;
export const emptyDeliveryAddress: DeliveryAddress = {
  cep: "",
  street: "",
  number: "",
  district: "",
  city: "",
  uf: "",
  complement: "",
};
export const maskCEP = (value: string) =>
  onlyDigits(value)
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");
export function composeDeliveryAddress(a: DeliveryAddress): string {
  return `${a.street.trim()}, ${a.number.trim()}${a.complement.trim() ? `, ${a.complement.trim()}` : ""} — ${a.district.trim()}, ${a.city.trim()}/${a.uf} — CEP ${maskCEP(a.cep)}`;
}
