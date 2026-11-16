import { Bike, Globe, ShoppingBag, Store } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { FULFILLMENT_LABELS, STATUS_LABELS } from "@/lib/orders";
import type { FulfillmentType, OrderChannel, OrderStatus, PaymentStatus } from "@/types";

const STATUS_VARIANT: Record<OrderStatus, "warning" | "caramel" | "success" | "gold" | "muted" | "destructive"> = {
  pendente: "warning",
  em_preparacao: "caramel",
  pronto: "success",
  saiu_para_entrega: "gold",
  concluido: "muted",
  cancelado: "destructive",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant={status === "pago" ? "success" : "outline"}>
      {status === "pago" ? "Pago" : "Pagamento pendente"}
    </Badge>
  );
}

export function ChannelBadge({ channel }: { channel: OrderChannel }) {
  const Icon = channel === "online" ? Globe : Store;
  return (
    <Badge variant="secondary" className="gap-1">
      <Icon className="h-3 w-3" aria-hidden />
      {channel === "online" ? "Online" : "Balcão"}
    </Badge>
  );
}

export function FulfillmentBadge({ fulfillment }: { fulfillment: FulfillmentType }) {
  const Icon = fulfillment === "entrega" ? Bike : ShoppingBag;
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="h-3 w-3" aria-hidden />
      {FULFILLMENT_LABELS[fulfillment]}
    </Badge>
  );
}
