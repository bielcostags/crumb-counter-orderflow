import { useRef, useState } from "react";
import { toast } from "sonner";
import { useAdminSession } from "@/contexts/AdminSessionContext";

export function useCatalogMutation() {
  const { status } = useAdminSession();
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  async function execute(operation: () => Promise<unknown>, message: string) {
    if (locked.current || status !== "signed-in") return false;
    locked.current = true;
    setPending(true);
    setFeedback(null);
    try {
      await operation();
      setFeedback({ error: false, message });
      toast.success(message);
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível salvar. Tente novamente.";
      setFeedback({ error: true, message });
      toast.error(message);
      return false;
    } finally {
      locked.current = false;
      setPending(false);
    }
  }
  return { pending, feedback, execute, clearFeedback: () => setFeedback(null) };
}
