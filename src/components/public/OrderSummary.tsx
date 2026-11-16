import { formatBRL, formatOrderNumber } from "@/lib/format";
import { countItems, FULFILLMENT_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/orders";
import { StatusBadge, PaymentBadge } from "@/components/shared/OrderBadges";
import type { Order } from "@/types";

/** Resumo público: não renderiza nome, telefone ou endereço do cliente. */
export function OrderSummary({ order }: { order: Order }) {
  return (
    <section
      className="space-y-4 rounded-xl border bg-card p-4 sm:p-6"
      aria-label="Resumo do pedido"
    >
      <h2 className="text-xl font-semibold text-primary">
        Pedido {formatOrderNumber(order.number)}
      </h2>
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={order.status} />
        <PaymentBadge status={order.paymentStatus} />
      </div>
      <p>
        {FULFILLMENT_LABELS[order.fulfillment]} · {PAYMENT_METHOD_LABELS[order.paymentMethod]} ao
        receber
      </p>
      <ul className="divide-y">
        {order.items.map((item) => (
          <li key={item.productId} className="py-3">
            <div className="flex justify-between gap-3">
              <span>
                {item.quantity} × {item.name}
              </span>
              <span className="tabular-nums">{formatBRL(item.subtotalCents)}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatBRL(item.unitPriceCents)} por unidade
            </p>
          </li>
        ))}
      </ul>
      <div className="flex justify-between gap-3 border-t pt-4 font-semibold">
        <span>Total · {countItems(order.items)} itens</span>
        <span>{formatBRL(order.totalCents)}</span>
      </div>
    </section>
  );
}
