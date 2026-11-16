import { Button } from "@/components/ui/button";
import {
  ChannelBadge,
  FulfillmentBadge,
  PaymentBadge,
  StatusBadge,
} from "@/components/shared/OrderBadges";
import { formatBRL, formatDateTime } from "@/lib/format";
import type { Order } from "@/types";

export function OrderTable({
  orders,
  onDetails,
}: {
  orders: Order[];
  onDetails: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Pedidos com origem, recebimento e pagamento</caption>
        <thead className="border-b bg-secondary">
          <tr>
            {[
              "Pedido / Cliente",
              "Data e horário",
              "Origem",
              "Recebimento",
              "Valor",
              "Status",
              "Pagamento",
              "Ações",
            ].map((label) => (
              <th key={label} scope="col" className="whitespace-nowrap p-3 font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b last:border-0">
              <td className="p-3">
                <p className="font-semibold">#{order.number}</p>
                <p>{order.customerName || "Cliente não informado"}</p>
              </td>
              <td className="whitespace-nowrap p-3">{formatDateTime(order.createdAt)}</td>
              <td className="p-3">
                <ChannelBadge channel={order.channel} />
              </td>
              <td className="p-3">
                <FulfillmentBadge fulfillment={order.fulfillment} />
              </td>
              <td className="whitespace-nowrap p-3 tabular-nums">{formatBRL(order.totalCents)}</td>
              <td className="p-3">
                <StatusBadge status={order.status} />
              </td>
              <td className="p-3">
                <PaymentBadge status={order.paymentStatus} />
              </td>
              <td className="p-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDetails(order.id)}
                  aria-label={`Detalhes do pedido ${order.number}`}
                >
                  Detalhes
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
