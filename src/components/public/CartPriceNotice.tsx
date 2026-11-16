import { useCartPriceReview } from "@/hooks/use-cart-price-review";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function CartPriceNotice({ disabled = false }: { disabled?: boolean }) {
  const { changes, acknowledgePrices } = useCartPriceReview();
  if (!changes.length)
    return (
      <p className="text-sm text-muted-foreground">
        Os preços apresentados são os valores atuais do cardápio e serão revalidados na confirmação.
      </p>
    );
  return (
    <section role="alert" className="space-y-3 rounded-xl border border-gold bg-gold-soft p-4">
      <h2 className="font-semibold text-primary">O preço de itens do carrinho mudou</h2>
      <ul className="space-y-1 text-sm">
        {changes.map((change) => (
          <li key={change.name}>
            {change.name}: de {formatBRL(change.before)} para {formatBRL(change.after)} por unidade.
          </li>
        ))}
      </ul>
      <p className="text-sm">Revise o total atualizado antes de continuar.</p>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => acknowledgePrices()}
      >
        Revisei os preços atualizados
      </Button>
    </section>
  );
}
