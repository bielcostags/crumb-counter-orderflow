import { formatBRL, formatDateTime } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/orders";
import type { Order } from "@/types";

export function POSReceipt({ order }: { order: Order }) {
  return (
    <section
      className="pos-receipt space-y-3 rounded-xl border bg-card p-5 text-sm"
      aria-label="Comprovante demonstrativo"
    >
      <h2 className="font-display text-lg font-semibold text-primary">Vila Rica</h2>
      <p className="font-semibold">COMPROVANTE DEMONSTRATIVO — SEM VALOR FISCAL</p>
      <p>
        Pedido #{order.number} · {formatDateTime(order.createdAt)}
      </p>
      <ul className="divide-y">
        {order.items.map((item) => (
          <li key={item.productId} className="py-2">
            <p>
              {item.quantity} × {item.name}
            </p>
            <div className="flex justify-between gap-3">
              <span>{formatBRL(item.unitPriceCents)} por unidade</span>
              <strong>{formatBRL(item.subtotalCents)}</strong>
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t pt-3 font-semibold">Total: {formatBRL(order.totalCents)}</p>
      <p>
        {PAYMENT_METHOD_LABELS[order.paymentMethod]} ·{" "}
        {order.paymentStatus === "pago" ? "Pagamento recebido (demo)" : "Pagamento pendente"}
      </p>
      <p>Origem: Balcão · Sem processamento financeiro ou emissão fiscal.</p>
    </section>
  );
}
