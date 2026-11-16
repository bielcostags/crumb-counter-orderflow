import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { OrderSummary } from "@/components/public/OrderSummary";
import { OrderDetails } from "@/components/admin/OrderDetails";
import { useOrderActions } from "@/components/admin/use-order-actions";
import { useCounterCart } from "@/contexts/counter-cart";
import { formatBRL } from "@/lib/format";
import type { Order } from "@/types";
import { POSReceipt } from "./POSReceipt";

export function POSConfirmation({ order }: { order: Order }) {
  const { draft, clear } = useCounterCart();
  const actions = useOrderActions();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1
        tabIndex={-1}
        ref={(node) => node?.focus()}
        className="text-2xl font-semibold text-primary"
      >
        Venda registrada com sucesso!
      </h1>
      <p role="status">
        Origem: Balcão · Retirada · Status inicial: Pendente. Nenhuma cobrança real foi processada.
      </p>
      <OrderSummary order={order} />
      {draft?.lastSale?.changeCents !== null && draft?.lastSale?.changeCents !== undefined && (
        <div className="rounded-lg border border-gold bg-gold-soft p-4">
          <p>Valor entregue: {formatBRL(draft.lastSale.receivedCents!)}</p>
          <p className="font-semibold">Troco: {formatBRL(draft.lastSale.changeCents)}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Button className="min-h-11" onClick={clear}>
          Nova venda
        </Button>
        <Button asChild variant="outline">
          <Link to="/admin/pedidos">Visualizar pedidos</Link>
        </Button>
        <Button variant="outline" onClick={() => actions.select(order.id)}>
          Visualizar pedido registrado
        </Button>
      </div>
      <POSReceipt order={order} />
      <Button variant="outline" onClick={() => window.print()}>
        Imprimir comprovante demonstrativo
      </Button>
      <OrderDetails actions={actions} />
    </div>
  );
}
