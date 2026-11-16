import { useRef, useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";
import { useAdminSession } from "@/contexts/AdminSessionContext";
import { canCancel, canTransition, getNextStatus } from "@/lib/orders";

export function useOrderActions() {
  const { data, services } = useStore();
  const { status } = useAdminSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<"cancel" | "paid" | null>(null);
  const [pending, setPending] = useState(false);
  const locked = useRef(false);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const selected = data?.orders.find((o) => o.id === selectedId) ?? null;
  function select(id: string | null) {
    setSelectedId(id);
    setConfirmation(null);
    setFeedback(null);
  }
  async function run(id: string, action: "advance" | "cancel" | "paid") {
    if (locked.current || status !== "signed-in") return;
    locked.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const order = data?.orders.find((o) => o.id === id);
      if (!order) throw new Error("Pedido não encontrado.");
      if (action === "advance") {
        const next = getNextStatus(order);
        if (!next || !canTransition(order, next))
          throw new Error("Não é possível avançar este pedido.");
        await services.orders.updateStatus(id, next);
      } else if (action === "cancel") {
        if (!canCancel(order)) throw new Error("Este pedido não pode ser cancelado.");
        await services.orders.updateStatus(id, "cancelado");
      } else {
        if (order.status === "cancelado" || order.paymentStatus === "pago")
          throw new Error("Pagamento incompatível com este pedido.");
        await services.orders.markPaid(id);
      }
      const message =
        action === "paid"
          ? "Recebimento demonstrativo registrado. Nenhuma cobrança realizada."
          : action === "cancel"
            ? "Pedido cancelado. Não houve estorno financeiro."
            : "Status atualizado.";
      setFeedback({ error: false, message });
      toast.success(message);
      setConfirmation(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível atualizar. Tente novamente.";
      setFeedback({ error: true, message });
      toast.error(message);
    } finally {
      locked.current = false;
      setPending(false);
    }
  }
  return { selected, select, confirmation, setConfirmation, pending, feedback, run };
}
