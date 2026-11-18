import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { useDeliveryAddress } from "@/hooks/use-delivery-address";
export function DeliveryAddressFields({
  delivery,
  errors,
}: {
  delivery: ReturnType<typeof useDeliveryAddress>;
  errors: Record<string, string>;
}) {
  const fields = [
    ["cep", "CEP", 9],
    ["street", "Rua/logradouro", 70],
    ["number", "Número", 10],
    ["district", "Bairro", 40],
    ["city", "Cidade", 40],
    ["uf", "Estado/UF", 2],
    ["complement", "Complemento (opcional)", 40],
  ] as const;
  return (
    <fieldset className="space-y-3 rounded-xl border p-4">
      <legend className="px-1 font-semibold">Endereço de entrega</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([key, label, max]) => (
          <div key={key} className={key === "street" ? "space-y-2 sm:col-span-2" : "space-y-2"}>
            <Label htmlFor={key}>{label}</Label>
            <Input
              id={key}
              name={key}
              value={delivery.address[key]}
              maxLength={max}
              required={key !== "complement"}
              inputMode={key === "cep" ? "numeric" : "text"}
              onChange={(e) => delivery.update(key, e.target.value)}
              aria-invalid={!!errors[key]}
              aria-describedby={errors[key] ? `${key}-error` : undefined}
            />
            {errors[key] && (
              <p id={`${key}-error`} role="alert" className="text-sm text-destructive">
                {errors[key]}
              </p>
            )}
          </div>
        ))}
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {delivery.message ||
          "Consulte pelo CEP ou preencha manualmente. O número deve ser informado por você."}
      </p>
    </fieldset>
  );
}
