import { useCounterCart } from "@/contexts/counter-cart";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/lib/format";
import { calculateCashChange } from "@/lib/pos";
import { usePOSQuote } from "./use-pos-quote";

export function POSCheckout({
  pending,
  error,
  onClose,
  onSubmit,
}: {
  pending: boolean;
  error: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const { draft, update, review } = useCounterCart();
  const quote = usePOSQuote();
  if (!draft) return null;
  const cash = draft.paid && draft.paymentMethod === "dinheiro";
  let cashError = "";
  let change: number | null = null;
  if (cash) {
    try {
      change = calculateCashChange(quote.total, draft.cash).changeCents;
    } catch (err) {
      cashError = err instanceof Error ? err.message : "Revise o valor recebido.";
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirmar pedido de balcão</DialogTitle>
          <DialogDescription>
            Pagamento exclusivamente demonstrativo, sem cobrança real. Retirada no balcão.
          </DialogDescription>
        </DialogHeader>
        <p>{draft.customerName.trim() || "Cliente não informado"}</p>
        <ul className="divide-y">
          {quote.items.map((item) => (
            <li key={item.productId} className="py-2">
              <div className="flex justify-between gap-3">
                <span>
                  {item.quantity} × {item.name}
                </span>
                <span>{formatBRL(item.subtotalCents)}</span>
              </div>
              {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
            </li>
          ))}
        </ul>
        {draft.notes && <p className="text-sm">Observações gerais: {draft.notes}</p>}
        <p className="border-t pt-3 font-semibold">Total: {formatBRL(quote.total)}</p>
        {quote.error && (
          <p role="alert" className="text-destructive">
            {quote.error}
          </p>
        )}
        {!!quote.changes.length && (
          <div role="alert" className="space-y-2 rounded-lg bg-gold-soft p-3">
            <p>O catálogo mudou. Revise os itens e valores atualizados.</p>
            {quote.changes.map((change, i) => (
              <p key={i} className="text-sm">
                {change}
              </p>
            ))}
            <Button variant="outline" disabled={pending || !!quote.error} onClick={review}>
              Revisei o catálogo atualizado
            </Button>
          </div>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (
              !pending &&
              !cashError &&
              !quote.error &&
              !quote.changes.length &&
              quote.items.length
            )
              onSubmit();
          }}
          aria-busy={pending}
          className="space-y-4"
        >
          <fieldset disabled={pending} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pos-payment">Forma de pagamento</Label>
              <select
                id="pos-payment"
                className="h-11 w-full rounded-md border bg-card px-3"
                value={draft.paymentMethod}
                onChange={(e) =>
                  update({ paymentMethod: e.target.value as typeof draft.paymentMethod })
                }
              >
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pos-paid">Situação do pagamento</Label>
              <select
                id="pos-paid"
                className="h-11 w-full rounded-md border bg-card px-3"
                value={draft.paid ? "paid" : "pending"}
                onChange={(e) => update({ paid: e.target.value === "paid" })}
              >
                <option value="pending">Pagamento pendente</option>
                <option value="paid">Pagamento recebido</option>
              </select>
            </div>
            {cash && (
              <div className="space-y-2">
                <Label htmlFor="pos-cash">Valor entregue pelo cliente em R$ (opcional)</Label>
                <Input
                  id="pos-cash"
                  inputMode="decimal"
                  maxLength={30}
                  value={draft.cash}
                  onChange={(e) => update({ cash: e.target.value })}
                  aria-invalid={!!cashError}
                  aria-describedby="pos-cash-error"
                />
                <p id="pos-cash-error" className="text-sm text-destructive">
                  {cashError}
                </p>
                {change !== null && (
                  <p role="status" className="font-semibold text-success">
                    Troco: {formatBRL(change)}
                  </p>
                )}
              </div>
            )}
          </fieldset>
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              className="min-h-11"
              disabled={
                pending ||
                !!cashError ||
                !!quote.error ||
                !!quote.changes.length ||
                !quote.items.length
              }
            >
              {pending ? "Registrando venda…" : "Registrar venda demonstrativa"}
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
              Voltar ao atendimento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
