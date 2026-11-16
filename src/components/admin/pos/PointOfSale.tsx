import { useRef, useState } from "react";
import { toast } from "sonner";
import { useCounterCart } from "@/contexts/counter-cart";
import { useStore } from "@/contexts/StoreContext";
import { useAdminSession } from "@/contexts/AdminSessionContext";
import { counterOrderSchema } from "@/lib/orders";
import { calculateCashChange } from "@/lib/pos";
import { LoadingBlock } from "@/components/shared/States";
import { Button } from "@/components/ui/button";
import { POSProductGrid } from "./POSProductGrid";
import { POSCart } from "./POSCart";
import { POSCheckout } from "./POSCheckout";
import { POSConfirmation } from "./POSConfirmation";
import { usePOSQuote } from "./use-pos-quote";

export function PointOfSale() {
  const { draft, complete, clear } = useCounterCart();
  const { data, services } = useStore();
  const { status } = useAdminSession();
  const quote = usePOSQuote();
  const [checkout, setCheckout] = useState(false);
  const [pending, setPending] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState("");
  if (!draft || !data) return <LoadingBlock />;
  const sale = draft.lastSale
    ? data.orders.find((order) => order.id === draft.lastSale!.orderId)
    : null;
  async function submit() {
    if (locked.current || status !== "signed-in" || !draft || draft.lastSale) return;
    setError("");
    if (quote.error || quote.changes.length || !quote.items.length) {
      setError(quote.error || "Revise o catálogo antes de registrar.");
      return;
    }
    locked.current = true;
    setPending(true);
    try {
      const parsed = counterOrderSchema.safeParse(draft);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Revise o pedido.");
      const cash =
        draft.paymentMethod === "dinheiro" && draft.paid
          ? calculateCashChange(quote.total, draft.cash)
          : { receivedCents: null, changeCents: null };
      const order = await services.orders.createCounterOrder(
        {
          ...parsed.data,
          customerName: parsed.data.customerName ?? "",
          notes: parsed.data.notes ?? "",
          lines: parsed.data.lines.map((line) => ({ ...line, notes: line.notes ?? "" })),
        },
        structuredClone(quote.items),
      );
      complete(order, cash);
      setCheckout(false);
      toast.success(`Pedido #${order.number} registrado no balcão.`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível registrar. Tente novamente.";
      setError(message);
      toast.error(message);
    } finally {
      locked.current = false;
      setPending(false);
    }
  }
  if (sale) return <POSConfirmation order={sale} />;
  if (draft.lastSale)
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Último pedido não encontrado</h1>
        <p>
          Os dados da demonstração podem ter sido restaurados. Nenhuma venda será reenviada
          automaticamente.
        </p>
        <Button onClick={clear}>Nova venda</Button>
      </div>
    );
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-primary">Atendimento no balcão</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          PDV demonstrativo. Use apenas dados fictícios. Pedido salvo neste navegador, independente
          do carrinho online.
        </p>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,1fr)]">
        <POSProductGrid disabled={pending} />
        <POSCart
          disabled={pending}
          onCheckout={() => {
            setError("");
            setCheckout(true);
          }}
        />
      </div>
      {checkout && (
        <POSCheckout
          pending={pending}
          error={error}
          onClose={() => setCheckout(false)}
          onSubmit={() => void submit()}
        />
      )}
    </>
  );
}
