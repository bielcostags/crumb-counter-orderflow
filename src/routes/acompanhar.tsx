import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";

import { PublicLayout } from "@/components/public/PublicLayout";
import { OrderSummary } from "@/components/public/OrderSummary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/contexts/StoreContext";
import { getStatusFlow, STATUS_LABELS } from "@/lib/orders";
import { formatDateTime } from "@/lib/format";
import { LoadingBlock, EmptyState } from "@/components/shared/States";

export const Route = createFileRoute("/acompanhar")({
  validateSearch: (search: Record<string, unknown>): { numero?: number } => {
    const number = Number(search["numero"]);
    return Number.isSafeInteger(number) && number > 0 ? { numero: number } : {};
  },
  head: () => ({
    meta: [
      { title: "Acompanhar pedido — Vila Rica" },
      {
        name: "description",
        content: "Acompanhe o status do seu pedido pelo número (demonstração).",
      },
      { property: "og:title", content: "Acompanhar pedido — Vila Rica" },
      { property: "og:description", content: "Acompanhe o status do seu pedido pelo número." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const { numero } = Route.useSearch();
  const { data } = useStore();
  const [query, setQuery] = useState(numero ? String(numero) : "");
  const selected = numero ?? null;
  const [error, setError] = useState("");
  const navigate = Route.useNavigate();
  const order = data?.orders.find((o) => o.number === selected);
  function search(event: FormEvent) {
    event.preventDefault();
    const value = query.trim().replace(/^#/, "");
    const number = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number <= 0) {
      setError("Informe um número de pedido válido.");
      return;
    }
    setError("");
    void navigate({ search: { numero: number }, replace: true });
  }
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-semibold text-primary">Acompanhar pedido</h1>
        <p className="text-sm text-muted-foreground">
          Consulta apenas no ambiente demonstrativo deste navegador, com atualização local entre
          abas. Não há sincronização entre dispositivos. Use somente dados fictícios.
        </p>
        <form onSubmit={search} className="space-y-2">
          <Label htmlFor="order-number">Número do pedido</Label>
          <div className="flex gap-2">
            <Input
              id="order-number"
              inputMode="numeric"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex.: 1015"
              aria-invalid={!!error}
              aria-describedby={error ? "search-error" : undefined}
            />
            <Button type="submit">Consultar</Button>
          </div>
          {error && (
            <p id="search-error" role="alert" className="text-destructive">
              {error}
            </p>
          )}
        </form>
        {!data ? (
          <LoadingBlock />
        ) : selected === null ? (
          <EmptyState
            icon={ClipboardList}
            title="Consulte seu pedido"
            description="Informe o número recebido na confirmação."
          />
        ) : !order ? (
          <div role="status">
            <EmptyState
              icon={ClipboardList}
              title="Pedido não encontrado"
              description="Confira o número. Somente pedidos deste ambiente demonstrativo podem ser consultados."
            />
          </div>
        ) : (
          <div className="space-y-6" aria-live="polite">
            <OrderSummary order={order} />
            {order.status === "cancelado" && (
              <p
                role="status"
                className="rounded-lg border border-destructive p-4 text-destructive"
              >
                Este pedido foi cancelado.
              </p>
            )}
            <section className="rounded-xl border bg-card p-4 sm:p-6" aria-label="Linha do tempo">
              <h2 className="mb-4 font-semibold">Linha do tempo</h2>
              <ol className="space-y-4 border-l-2 border-gold pl-4">
                {getStatusFlow(order.fulfillment).map((status) => {
                  const event = order.history.find((e) => e.status === status);
                  return (
                    <li
                      key={status}
                      aria-current={order.status === status ? "step" : undefined}
                      className={event ? "text-primary" : "text-muted-foreground"}
                    >
                      <p className="font-medium">{STATUS_LABELS[status]}</p>
                      <p className="text-sm">
                        {event ? (
                          <time dateTime={event.at}>{formatDateTime(event.at)}</time>
                        ) : order.status === "cancelado" ? (
                          "Não realizado"
                        ) : (
                          "Aguardando"
                        )}
                      </p>
                    </li>
                  );
                })}
              </ol>
              <h3 className="mb-2 mt-6 font-semibold">Histórico de alterações</h3>
              <ul className="space-y-2 text-sm">
                {order.history.map((event, index) => (
                  <li key={index}>
                    {STATUS_LABELS[event.status]} ·{" "}
                    <time dateTime={event.at}>{formatDateTime(event.at)}</time>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
