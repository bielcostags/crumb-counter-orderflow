import { parseBRLToCents } from "@/lib/format";
import { OrderValidationError } from "@/lib/orders";

/** Auxílio de interface: valor entregue nunca é armazenado como valor da venda. */
export function calculateCashChange(
  totalCents: number,
  received: string,
): { receivedCents: number | null; changeCents: number | null } {
  if (!received.trim()) return { receivedCents: null, changeCents: null };
  const receivedCents = parseBRLToCents(received);
  if (!Number.isSafeInteger(receivedCents) || receivedCents < 0)
    throw new OrderValidationError("Informe um valor recebido válido e não negativo.");
  if (receivedCents < totalCents)
    throw new OrderValidationError("O valor recebido deve ser igual ou superior ao total.");
  return { receivedCents, changeCents: receivedCents - totalCents };
}
