import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { OrderSummary } from "@/components/public/OrderSummary";
import { OrderDetails } from "@/components/admin/OrderDetails";
import { useOrderActions } from "@/components/admin/use-order-actions";
import { useCounterCart } from "@/contexts/counter-cart";
import type { Order } from "@/types";
import { POSReceipt } from "./POSReceipt";

export function POSConfirmation({ order }: { order: Order }) {
  const { draft, clear } = useCounterCart();
  const actions = useOrderActions();
  // Compatibilidade com comprovantes antigos que guardavam o recebido só no rascunho.
  const previousAmount =
    draft?.lastSale?.orderId === order.id ? draft.lastSale.receivedCents : null;
  const receiptOrder =
    order.cashAmountCents === undefined &&
    previousAmount != null &&
    order.paymentMethod === "dinheiro" &&
    order.paymentStatus === "pago"
      ? { ...order, cashAmountCents: previousAmount }
      : order;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1
        tabIndex={-1}
        ref={(node) => node?.focus()}
        className="text-2xl font-semibold text-primary"
      >
        Venda registrada com sucesso!
      </h1>
      <p role="status">Origem: Balcão · Retirada · Status inicial: Pendente.</p>
      <OrderSummary order={receiptOrder} />
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
      <POSReceipt order={receiptOrder} />
      <Button variant="outline" onClick={() => window.print()}>
        Imprimir comprovante
      </Button>
      <OrderDetails actions={actions} />
    </div>
  );
}
