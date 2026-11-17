import { Link } from "@tanstack/react-router";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ClipboardList } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingBlock } from "@/components/shared/States";
import {
  computeDayMetrics,
  computeLastDays,
  isSameDay,
  KANBAN_COLUMNS,
  STATUS_LABELS,
} from "@/lib/orders";
import { formatBRL } from "@/lib/format";
import { OrderTable } from "./OrderTable";
import { OrderDetails } from "./OrderDetails";
import { useOrderActions } from "./use-order-actions";
import { useAdminClock } from "./use-admin-clock";

export function AdminDashboard() {
  const { data } = useStore();
  const now = useAdminClock();
  const actions = useOrderActions();
  if (!data) return <LoadingBlock />;
  const metrics = computeDayMetrics(data.orders, now);
  const days = computeLastDays(data.orders, now);
  const today = data.orders.filter((order) => isSameDay(new Date(order.createdAt), now));
  const indicators = [
    ["Pedidos realizados hoje", metrics.ordersCount],
    ["Valor dos pedidos", formatBRL(metrics.orderedCents)],
    ["Vendas pagas", formatBRL(metrics.paidCents)],
    ["Ticket médio", formatBRL(metrics.avgTicketCents)],
    ["Pedidos pendentes", metrics.pendingCount],
    ["Em preparação", today.filter((o) => o.status === "em_preparacao").length],
    ["Concluídos", today.filter((o) => o.status === "concluido").length],
    ["Cancelados", metrics.cancelledCount],
  ];
  const recent = [...data.orders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Visão geral</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Indicadores de hoje, derivados dos pedidos deste navegador.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/pedidos">Gerenciar pedidos</Link>
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {indicators.map(([label, value]) => (
          <section key={label} aria-label={String(label)} className="rounded-xl border bg-card p-4">
            <h2 className="text-sm text-muted-foreground">{label}</h2>
            <p className="mt-2 font-display text-2xl font-semibold text-primary tabular-nums">
              {value}
            </p>
          </section>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Pedidos, valor e ticket excluem cancelados. Vendas pagas somam apenas pedidos não cancelados
        marcados como pagos, pela data de criação, sem representar movimentação bancária.
      </p>
      <section
        className="min-w-0 rounded-xl border bg-card p-4"
        aria-label="Evolução dos últimos sete dias"
      >
        <h2 className="mb-4 font-semibold">Últimos sete dias · valores em R$</h2>
        <div className="h-64 min-w-0" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={days}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis width={50} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatBRL(Number(value) * 100)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="pedidos"
                name="Valor dos pedidos"
                stroke="var(--chart-1)"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="pagas"
                name="Vendas pagas"
                stroke="var(--chart-2)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-primary">
            Ver valores do gráfico em tabela
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Valores dos últimos sete dias</caption>
              <thead>
                <tr>
                  <th scope="col" className="p-2">
                    Dia
                  </th>
                  <th scope="col" className="p-2">
                    Pedidos
                  </th>
                  <th scope="col" className="p-2">
                    Vendas pagas
                  </th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.date}>
                    <td className="p-2">{day.label}</td>
                    <td className="p-2">{formatBRL(Math.round(day.pedidos * 100))}</td>
                    <td className="p-2">{formatBRL(Math.round(day.pagas * 100))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-semibold">Origem dos pedidos de hoje</h2>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-secondary p-3">
              <dt>Online</dt>
              <dd className="text-2xl font-semibold text-primary">{metrics.onlineCount}</dd>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <dt>Balcão</dt>
              <dd className="text-2xl font-semibold text-primary">{metrics.counterCount}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">Exclui pedidos cancelados.</p>
        </section>
        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-semibold">Distribuição por status · hoje</h2>
          <dl className="space-y-2">
            {KANBAN_COLUMNS.map((status) => (
              <div key={status} className="flex justify-between gap-3 text-sm">
                <dt>{STATUS_LABELS[status]}</dt>
                <dd className="font-semibold">
                  {today.filter((order) => order.status === status).length}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-primary">Pedidos recentes</h2>
        {recent.length ? (
          <OrderTable orders={recent} onDetails={actions.select} />
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="Nenhum pedido registrado"
            description="Pedidos do checkout aparecerão aqui."
          />
        )}
      </section>
      <OrderDetails actions={actions} />
    </>
  );
}
