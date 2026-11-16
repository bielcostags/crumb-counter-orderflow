import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, LoadingBlock } from "@/components/shared/States";
import { ChannelBadge, FulfillmentBadge, PaymentBadge } from "@/components/shared/OrderBadges";
import { useStore } from "@/contexts/StoreContext";
import { countItems, getNextStatus, KANBAN_COLUMNS, STATUS_LABELS } from "@/lib/orders";
import { formatBRL, formatDateTime } from "@/lib/format";
import { OrderTable } from "./OrderTable";
import { OrderDetails } from "./OrderDetails";
import { useOrderActions } from "./use-order-actions";

const emptyFilters = { query: "", status: "", channel: "", fulfillment: "", payment: "", date: "" };
export function AdminOrders() {
  const { data } = useStore();
  const actions = useOrderActions();
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [filters, setFilters] = useState(emptyFilters);
  if (!data) return <LoadingBlock />;
  const query = filters.query
    .trim()
    .replace(/^#/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const orders = data.orders
    .filter((order) => {
      const name = (order.customerName ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      const date = new Date(order.createdAt);
      const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return (
        (!query || String(order.number).includes(query) || name.includes(query)) &&
        (!filters.status || order.status === filters.status) &&
        (!filters.channel || order.channel === filters.channel) &&
        (!filters.fulfillment || order.fulfillment === filters.fulfillment) &&
        (!filters.payment || order.paymentStatus === filters.payment) &&
        (!filters.date || day === filters.date)
      );
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Pedidos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fila compartilhada entre online e balcão neste navegador.
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Visualização dos pedidos">
          <Button
            variant={view === "kanban" ? "default" : "outline"}
            aria-pressed={view === "kanban"}
            onClick={() => setView("kanban")}
          >
            Kanban
          </Button>
          <Button
            variant={view === "table" ? "default" : "outline"}
            aria-pressed={view === "table"}
            onClick={() => setView("table")}
          >
            Lista
          </Button>
        </div>
      </div>
      <section
        className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Filtros de pedidos"
      >
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="order-query">Pesquisar número ou cliente</Label>
          <Input
            id="order-query"
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            placeholder="Ex.: 1015 ou Cliente Exemplo"
          />
        </div>
        {(
          [
            ["status", "Status", KANBAN_COLUMNS.map((status) => [status, STATUS_LABELS[status]])],
            [
              "channel",
              "Origem",
              [
                ["online", "Online"],
                ["balcao", "Balcão"],
              ],
            ],
            [
              "fulfillment",
              "Recebimento",
              [
                ["retirada", "Retirada"],
                ["entrega", "Entrega"],
              ],
            ],
            [
              "payment",
              "Pagamento",
              [
                ["pendente", "Pendente"],
                ["pago", "Pago"],
              ],
            ],
          ] as const
        ).map(([key, label, options]) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={`filter-${key}`}>{label}</Label>
            <select
              id={`filter-${key}`}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={filters[key]}
              onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
            >
              <option value="">Todos</option>
              {options.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div className="space-y-2">
          <Label htmlFor="filter-date">Data do pedido</Label>
          <Input
            id="filter-date"
            type="date"
            value={filters.date}
            onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
          />
        </div>
        <Button variant="outline" className="self-end" onClick={() => setFilters(emptyFilters)}>
          Limpar filtros
        </Button>
      </section>
      <p role="status" className="text-sm text-muted-foreground">
        {orders.length} pedido(s) encontrado(s)
      </p>
      {actions.feedback && !actions.selected && (
        <p
          role={actions.feedback.error ? "alert" : "status"}
          className={actions.feedback.error ? "text-destructive" : "text-success"}
        >
          {actions.feedback.message}
        </p>
      )}
      {!orders.length ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhum pedido encontrado"
          description="Altere ou limpe os filtros para consultar outros pedidos."
        />
      ) : view === "table" ? (
        <OrderTable orders={orders} onDetails={actions.select} />
      ) : (
        <div className="overflow-x-auto pb-3" aria-label="Kanban de pedidos">
          <div className="grid min-w-[1740px] grid-cols-6 gap-4">
            {KANBAN_COLUMNS.map((status) => {
              const column = orders.filter((order) => order.status === status);
              return (
                <section
                  key={status}
                  className="rounded-xl border bg-secondary/40 p-3"
                  aria-label={STATUS_LABELS[status]}
                >
                  <h2 className="mb-3 flex justify-between gap-2 font-semibold text-primary">
                    {STATUS_LABELS[status]}
                    <span className="rounded-full bg-card px-2 text-sm">{column.length}</span>
                  </h2>
                  <div className="space-y-3">
                    {!column.length && (
                      <p className="py-4 text-sm text-muted-foreground">Sem pedidos</p>
                    )}
                    {column.map((order) => {
                      const next = getNextStatus(order);
                      return (
                        <article
                          key={order.id}
                          aria-label={`Pedido ${order.number}`}
                          className="space-y-3 rounded-lg border bg-card p-3 shadow-soft"
                        >
                          <div>
                            <h3 className="font-semibold">#{order.number}</h3>
                            <p className="text-sm">
                              {order.customerName || "Cliente não informado"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDateTime(order.createdAt)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <ChannelBadge channel={order.channel} />
                            <FulfillmentBadge fulfillment={order.fulfillment} />
                            <PaymentBadge status={order.paymentStatus} />
                          </div>
                          <div className="flex justify-between gap-2 text-sm">
                            <span>{countItems(order.items)} itens</span>
                            <strong>{formatBRL(order.totalCents)}</strong>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => actions.select(order.id)}
                            aria-label={`Detalhes do pedido ${order.number}`}
                          >
                            Ver detalhes
                          </Button>
                          {next && (
                            <Button
                              size="sm"
                              className="h-auto min-h-9 w-full whitespace-normal"
                              disabled={actions.pending}
                              onClick={() => void actions.run(order.id, "advance")}
                              aria-label={`Pedido ${order.number}: avançar para ${STATUS_LABELS[next]}`}
                            >
                              Avançar para {STATUS_LABELS[next]}
                            </Button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
      <OrderDetails actions={actions} />
    </>
  );
}
