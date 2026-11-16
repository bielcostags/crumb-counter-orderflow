import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  ChannelBadge,
  FulfillmentBadge,
  PaymentBadge,
  StatusBadge,
} from "@/components/shared/OrderBadges";
import { formatBRL, formatDateTime } from "@/lib/format";
import {
  canCancel,
  getNextStatus,
  getStatusFlow,
  PAYMENT_METHOD_LABELS,
  STATUS_LABELS,
} from "@/lib/orders";
import type { useOrderActions } from "./use-order-actions";

type Actions = ReturnType<typeof useOrderActions>;
export function OrderDetails({ actions }: { actions: Actions }) {
  const {
    selected: order,
    select,
    pending,
    confirmation,
    setConfirmation,
    run,
    feedback,
  } = actions;
  const next = order ? getNextStatus(order) : null;
  return (
    <>
      <Dialog
        open={!!order}
        onOpenChange={(open) => {
          if (!open && !pending) {
            select(null);
            setConfirmation(null);
          }
        }}
      >
        {order && (
          <DialogContent
            className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto"
            onCloseAutoFocus={(e) => {
              if (pending) e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle>Pedido #{order.number}</DialogTitle>
              <DialogDescription>
                Dados fictícios disponíveis na área demonstrativa da equipe.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={order.status} />
              <PaymentBadge status={order.paymentStatus} />
              <ChannelBadge channel={order.channel} />
              <FulfillmentBadge fulfillment={order.fulfillment} />
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Cliente</dt>
                <dd>{order.customerName || "Não informado"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Telefone fictício</dt>
                <dd>{order.customerPhone || "Não informado"}</dd>
              </div>
              {order.fulfillment === "entrega" && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Endereço fictício</dt>
                  <dd>{order.address || "Não informado"}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Data e horário</dt>
                <dd>{formatDateTime(order.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Pagamento ao receber</dt>
                <dd>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</dd>
              </div>
            </dl>
            <ul className="divide-y">
              {order.items.map((item) => (
                <li key={item.productId} className="py-3">
                  <div className="flex justify-between gap-3">
                    <span>
                      {item.quantity} × {item.name}
                    </span>
                    <strong>{formatBRL(item.subtotalCents)}</strong>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatBRL(item.unitPriceCents)} por unidade
                  </p>
                  {item.notes && <p className="mt-1 text-sm">Observação: {item.notes}</p>}
                </li>
              ))}
            </ul>
            {order.notes && <p className="text-sm">Observações gerais: {order.notes}</p>}
            <p className="border-t pt-3 font-semibold">Total: {formatBRL(order.totalCents)}</p>
            <section>
              <h3 className="font-semibold">Histórico de alterações</h3>
              <ol className="mt-2 space-y-2 border-l-2 border-gold pl-3 text-sm">
                {order.history.map((event, i) => (
                  <li key={i}>
                    {STATUS_LABELS[event.status]} ·{" "}
                    <time dateTime={event.at}>{formatDateTime(event.at)}</time>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-muted-foreground">
                Fluxo:{" "}
                {getStatusFlow(order.fulfillment)
                  .map((s) => STATUS_LABELS[s])
                  .join(" → ")}
              </p>
            </section>
            {order.status === "cancelado" && order.paymentStatus === "pago" && (
              <p className="text-sm text-destructive">
                Pagamento demonstrativo preservado. Não houve estorno financeiro.
              </p>
            )}
            {feedback && (
              <p
                role={feedback.error ? "alert" : "status"}
                className={feedback.error ? "text-destructive" : "text-success"}
              >
                {feedback.message}
              </p>
            )}
            <div className="flex flex-wrap gap-2" aria-busy={pending}>
              {next && (
                <Button disabled={pending} onClick={() => void run(order.id, "advance")}>
                  Avançar para {STATUS_LABELS[next]}
                </Button>
              )}
              {order.status !== "cancelado" && order.paymentStatus !== "pago" && (
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => setConfirmation("paid")}
                >
                  Marcar como pago
                </Button>
              )}
              {canCancel(order) && (
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() => setConfirmation("cancel")}
                >
                  Cancelar pedido
                </Button>
              )}
              {pending && (
                <span role="status" className="text-sm">
                  Processando…
                </span>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
      <AlertDialog
        open={!!confirmation && !!order}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirmation(null);
        }}
      >
        <AlertDialogContent className="w-[calc(100%_-_2rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmation === "cancel" ? "Confirmar cancelamento?" : "Confirmar recebimento?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation === "cancel"
                ? `O pedido #${order?.number} será cancelado e não poderá ser reaberto. Os dados e o histórico serão preservados. ${order?.paymentStatus === "pago" ? "Já foi marcado como pago: não haverá estorno. " : ""}Esta operação é apenas demonstrativa.`
                : `Marcar o pedido #${order?.number} como pago registra um recebimento demonstrativo de ${formatBRL(order?.totalCents ?? 0)}. Nenhuma cobrança real será processada.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {feedback?.error && (
            <p role="alert" className="text-destructive">
              {feedback.message}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Voltar</AlertDialogCancel>
            <Button
              disabled={pending}
              variant={confirmation === "cancel" ? "destructive" : "default"}
              onClick={() => {
                if (order && confirmation) void run(order.id, confirmation);
              }}
            >
              {pending
                ? "Processando…"
                : confirmation === "cancel"
                  ? "Confirmar cancelamento"
                  : "Confirmar recebimento"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
