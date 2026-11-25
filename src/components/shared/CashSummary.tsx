import { formatBRL } from "@/lib/format";
import type { Order } from "@/types";
export function CashSummary({ order }: { order: Order }) {
  if (order.paymentMethod !== "dinheiro" || order.cashAmountCents === undefined) return null;
  return (
    <div className="space-y-1 rounded-lg border bg-gold-soft p-3 text-sm">
      <p>
        {order.channel === "online" ? "Valor previsto para pagamento" : "Valor recebido"}:{" "}
        {formatBRL(order.cashAmountCents)}
      </p>
      <p>
        Troco{order.channel === "online" ? " previsto" : ""}:{" "}
        {formatBRL(order.cashAmountCents - order.totalCents)}
        {order.cashAmountCents === order.totalCents ? " · Sem troco" : ""}
      </p>
      {order.channel === "online" && <p>Valor informado pelo cliente; não confirma recebimento.</p>}
    </div>
  );
}
