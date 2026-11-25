import { useDeliveryAddress } from "@/hooks/use-delivery-address";
import { composeDeliveryAddress, deliveryAddressSchema } from "@/lib/delivery-address";
import { DeliveryAddressFields } from "@/components/public/DeliveryAddressFields";
import { calculateCashChange } from "@/lib/pos";
import { useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBasket, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { CartPriceNotice } from "@/components/public/CartPriceNotice";
import { useCartPriceReview } from "@/hooks/use-cart-price-review";
import { PublicLayout } from "@/components/public/PublicLayout";
import { OrderSummary } from "@/components/public/OrderSummary";
import { EmptyState, LoadingBlock } from "@/components/shared/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { useStore } from "@/contexts/StoreContext";
import {
  buildOrderItems,
  calcTotalCents,
  checkoutSchema,
  MAX_NOTES_LENGTH,
  type CheckoutInput,
} from "@/lib/orders";
import { formatBRL } from "@/lib/format";
import type { Order } from "@/types";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Finalizar pedido — Vila Rica" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { lines } = useCart();
  const { changes } = useCartPriceReview();
  const { data, services } = useStore();
  const [input, setInput] = useState<CheckoutInput>({
    customerName: "",
    customerPhone: "",
    fulfillment: "retirada",
    address: "",
    paymentMethod: "pix",
    notes: "",
  });
  const [completed, setCompleted] = useState<Order | null>(null);
  const delivery = useDeliveryAddress(input.fulfillment === "entrega" && !completed);
  const [cash, setCash] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const update = <K extends keyof CheckoutInput>(key: K, value: CheckoutInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));
  let preview: ReturnType<typeof buildOrderItems> = [];
  let catalogError = "";
  let total = 0;
  if (data && lines?.length) {
    try {
      preview = buildOrderItems(lines, data.products, data.categories);
      total = calcTotalCents(preview);
    } catch (err) {
      catalogError = err instanceof Error ? err.message : "Revise os itens do carrinho.";
    }
  }
  let cashError = "";
  let cashPreview: ReturnType<typeof calculateCashChange> = {
    receivedCents: null,
    changeCents: null,
  };
  if (input.paymentMethod === "dinheiro") {
    try {
      cashPreview = calculateCashChange(total, cash);
    } catch (err) {
      cashError = err instanceof Error ? err.message : "Valor inválido.";
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || completed) return;
    let address = "";
    if (input.fulfillment === "entrega") {
      const result = deliveryAddressSchema.safeParse(delivery.address);
      if (!result.success) {
        setErrors(
          Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message])),
        );
        setError("Informe o endereço de entrega completo.");
        const field = event.currentTarget.elements.namedItem(
          String(result.error.issues[0]?.path[0]),
        );
        if (field instanceof HTMLElement) field.focus();
        return;
      }
      address = composeDeliveryAddress(result.data);
    }
    if (cashError) {
      setError(cashError);
      return;
    }
    const parsed = checkoutSchema.safeParse({
      ...input,
      address,
      cashAmountCents:
        input.paymentMethod === "dinheiro" ? (cashPreview.receivedCents ?? undefined) : undefined,
    });
    setError("");
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])),
      );
      const field = event.currentTarget.elements.namedItem(String(parsed.error.issues[0]?.path[0]));
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    setErrors({});
    if (!lines?.length || catalogError || changes.length) {
      setError(
        catalogError ||
          (changes.length
            ? "Revise os preços atualizados antes de confirmar."
            : "Seu carrinho está vazio."),
      );
      return;
    }
    sending.current = true;
    setBusy(true);
    try {
      // Serviço revalida catálogo, quantidades e preços; limpa o carrinho após criar.
      const order = await services.orders.createOnlineOrder(
        parsed.data,
        structuredClone(lines),
        structuredClone(preview),
      );
      setCompleted(order);
      toast.success(`Pedido #${order.number} registrado.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar. Tente novamente.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        {completed ? (
          <>
            <h1
              className="flex items-center gap-2 text-2xl font-semibold text-primary"
              tabIndex={-1}
              ref={(node) => node?.focus()}
            >
              <CheckCircle2 aria-hidden />
              Pedido registrado com sucesso!
            </h1>
            <p role="status">Guarde o número do pedido para acompanhar o andamento.</p>
            <OrderSummary order={completed} />
            {completed.fulfillment === "entrega" && <p>Endereço de entrega: {completed.address}</p>}
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/acompanhar" search={{ numero: completed.number }}>
                  Acompanhar pedido
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/">Voltar ao cardápio</Link>
              </Button>
            </div>
          </>
        ) : !data || !lines ? (
          <LoadingBlock />
        ) : !lines.length ? (
          <EmptyState
            icon={ShoppingBasket}
            title="Seu carrinho está vazio"
            description="Adicione produtos antes de finalizar."
            action={
              <Button asChild>
                <Link to="/">Ver cardápio</Link>
              </Button>
            }
          />
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-primary">Finalizar pedido</h1>
            <section className="rounded-xl border bg-card p-4" aria-label="Resumo da compra">
              <h2 className="font-semibold">Resumo da compra</h2>
              {catalogError ? (
                <p role="alert" className="mt-3 text-destructive">
                  {catalogError}
                </p>
              ) : (
                <>
                  <ul className="my-3 space-y-2">
                    {preview.map((item) => (
                      <li key={item.productId}>
                        <div className="flex justify-between gap-3">
                          <span>
                            {item.quantity} × {item.name}
                          </span>
                          <span>{formatBRL(item.subtotalCents)}</span>
                        </div>
                        {item.notes && (
                          <p className="text-sm text-muted-foreground">{item.notes}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="border-t pt-3 font-semibold">Total: {formatBRL(total)}</p>
                </>
              )}
              <Link to="/carrinho" className="mt-3 inline-block text-primary underline">
                Revisar carrinho
              </Link>
            </section>
            <CartPriceNotice disabled={busy} />
            <form onSubmit={submit} noValidate className="space-y-4" aria-busy={busy}>
              <fieldset disabled={busy} className="space-y-4">
                <legend className="mb-4 font-semibold">Dados do pedido</legend>
                {(
                  [
                    ["customerName", "Nome do cliente", 60],
                    ["customerPhone", "Telefone com DDD", 20],
                  ] as const
                ).map(([key, label, max]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>{label} (obrigatório)</Label>
                    <Input
                      id={key}
                      type={key === "customerPhone" ? "tel" : "text"}
                      autoComplete="off"
                      maxLength={max}
                      value={input[key]}
                      onChange={(e) => update(key, e.target.value)}
                      required
                      aria-invalid={!!errors[key]}
                      aria-describedby={errors[key] ? `${key}-error` : undefined}
                    />
                    {errors[key] && (
                      <p id={`${key}-error`} role="alert" className="text-sm text-destructive">
                        {errors[key]}
                      </p>
                    )}
                  </div>
                ))}
                <div className="space-y-2">
                  <Label htmlFor="fulfillment">Tipo de recebimento</Label>
                  <select
                    id="fulfillment"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={input.fulfillment}
                    onChange={(e) =>
                      update("fulfillment", e.target.value as CheckoutInput["fulfillment"])
                    }
                  >
                    <option value="retirada">Retirada</option>
                    <option value="entrega">Entrega</option>
                  </select>
                </div>
                {input.fulfillment === "entrega" && (
                  <DeliveryAddressFields delivery={delivery} errors={errors} />
                )}
                {errors["address"] && (
                  <p role="alert" className="text-sm text-destructive">
                    {errors["address"]}
                  </p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Forma de pagamento ao receber</Label>
                  <select
                    id="paymentMethod"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={input.paymentMethod}
                    onChange={(e) => {
                      update("paymentMethod", e.target.value as CheckoutInput["paymentMethod"]);
                      setCash("");
                    }}
                  >
                    <option value="pix">Pix</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao">Cartão</option>
                  </select>
                  <p className="text-sm text-muted-foreground">Pagamento no recebimento.</p>
                </div>
                {input.paymentMethod === "dinheiro" && (
                  <div className="space-y-2">
                    <Label htmlFor="checkout-cash">Vai pagar com quanto? (opcional)</Label>
                    <Input
                      id="checkout-cash"
                      inputMode="decimal"
                      maxLength={30}
                      value={cash}
                      onChange={(e) => setCash(e.target.value)}
                      aria-invalid={!!cashError}
                      aria-describedby="cash-help"
                    />
                    <p
                      id="cash-help"
                      role={cashError ? "alert" : "status"}
                      className={cashError ? "text-sm text-destructive" : "text-sm"}
                    >
                      {cashError ||
                        (cashPreview.changeCents === null
                          ? "Informe o valor em reais se precisar de troco."
                          : `Troco necessário: ${formatBRL(cashPreview.changeCents)}${cashPreview.changeCents === 0 ? " · Sem troco" : ""}`)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pagamento pendente até o recebimento.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações gerais (opcional)</Label>
                  <Textarea
                    id="notes"
                    maxLength={MAX_NOTES_LENGTH}
                    value={input.notes ?? ""}
                    onChange={(e) => update("notes", e.target.value)}
                  />
                </div>
              </fieldset>
              {error && (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={busy || !!cashError || !!catalogError || changes.length > 0}
              >
                {busy ? "Registrando pedido…" : "Confirmar pedido"}
              </Button>
            </form>
          </>
        )}
      </div>
    </PublicLayout>
  );
}
