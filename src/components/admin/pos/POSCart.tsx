import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useCounterCart } from "@/contexts/counter-cart";
import { useStore } from "@/contexts/StoreContext";
import { QuantityStepper } from "@/components/shared/QuantityStepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { countItems, isProductSellable, MAX_NOTES_LENGTH } from "@/lib/orders";
import { formatBRL } from "@/lib/format";
import { usePOSQuote } from "./use-pos-quote";

export function POSCart({ disabled, onCheckout }: { disabled: boolean; onCheckout: () => void }) {
  const { draft, quantity, itemNotes, remove, update, clear, review } = useCounterCart();
  const { data } = useStore();
  const quote = usePOSQuote();
  const [discard, setDiscard] = useState(false);
  if (!draft || !data) return null;
  return (
    <section
      className="space-y-4 rounded-xl border bg-card p-4"
      aria-label="Pedido presencial atual"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-primary">Pedido atual</h2>
        <Button
          variant="ghost"
          disabled={disabled || (!draft.lines.length && !draft.customerName && !draft.notes)}
          onClick={() => setDiscard(true)}
        >
          Limpar pedido
        </Button>
      </div>
      {!draft.lines.length ? (
        <p className="py-6 text-muted-foreground">
          O pedido de balcão está vazio. Selecione produtos para começar.
        </p>
      ) : (
        <ul className="divide-y">
          {draft.lines.map((line) => {
            const product = data.products.find((p) => p.id === line.productId);
            const valid = product && isProductSellable(product, data.categories);
            return (
              <li key={line.productId} className="space-y-3 py-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{product?.name ?? line.reviewedName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatBRL(product?.priceCents ?? line.reviewedPriceCents)} por unidade
                    </p>
                    {!valid && (
                      <p className="text-sm text-destructive">
                        Item indisponível. Remova ou revise antes de registrar.
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    onClick={() => remove(line.productId)}
                    aria-label={`Remover ${product?.name ?? line.reviewedName} do balcão`}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <fieldset disabled={disabled}>
                    <QuantityStepper
                      value={line.quantity}
                      onChange={(value) => quantity(line.productId, value)}
                      label={product?.name ?? line.reviewedName}
                    />
                  </fieldset>
                  <strong>
                    {formatBRL((product?.priceCents ?? line.reviewedPriceCents) * line.quantity)}
                  </strong>
                </div>
                <Label htmlFor={`pos-note-${line.productId}`} className="sr-only">
                  Observação de {product?.name ?? line.reviewedName}
                </Label>
                <Textarea
                  id={`pos-note-${line.productId}`}
                  maxLength={MAX_NOTES_LENGTH}
                  placeholder="Observações do item"
                  disabled={disabled}
                  value={line.notes}
                  onChange={(e) => itemNotes(line.productId, e.target.value)}
                />
              </li>
            );
          })}
        </ul>
      )}
      {!!quote.changes.length && (
        <div role="alert" className="space-y-2 rounded-lg border border-gold bg-gold-soft p-3">
          <p className="font-semibold">O catálogo mudou durante o atendimento.</p>
          {quote.changes.map((change, i) => (
            <p key={i} className="text-sm">
              {change}
            </p>
          ))}
          <p className="text-sm">Os preços e dados acima são os atuais.</p>
          <Button variant="outline" disabled={disabled || !!quote.error} onClick={review}>
            Revisei o catálogo atualizado
          </Button>
        </div>
      )}
      {quote.error && (
        <p role="alert" className="text-destructive">
          {quote.error}
        </p>
      )}
      <div className="flex justify-between gap-3 border-t pt-4 font-semibold">
        <span>{countItems(draft.lines)} itens · Total</span>
        <span>{quote.error ? "Revise os itens" : formatBRL(quote.total)}</span>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pos-customer">Nome fictício do cliente (opcional)</Label>
        <Input
          id="pos-customer"
          autoComplete="off"
          maxLength={60}
          disabled={disabled}
          value={draft.customerName}
          onChange={(e) => update({ customerName: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pos-notes">Observações gerais do balcão (opcional)</Label>
        <Textarea
          id="pos-notes"
          maxLength={MAX_NOTES_LENGTH}
          disabled={disabled}
          value={draft.notes}
          onChange={(e) => update({ notes: e.target.value })}
        />
      </div>
      <Button
        className="min-h-11 w-full"
        disabled={disabled || !draft.lines.length || !!quote.error || !!quote.changes.length}
        onClick={onCheckout}
      >
        Finalizar pedido de balcão
      </Button>
      <AlertDialog open={discard} onOpenChange={setDiscard}>
        <AlertDialogContent className="w-[calc(100%_-_2rem)]">
          <AlertDialogTitle>Descartar atendimento atual?</AlertDialogTitle>
          <AlertDialogDescription>
            Os itens e dados não finalizados do balcão serão limpos. O carrinho online e os pedidos
            registrados serão preservados.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar atendimento</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clear();
                setDiscard(false);
              }}
            >
              Confirmar descarte
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
