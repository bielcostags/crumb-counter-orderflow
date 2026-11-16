import { useEffect, useState } from "react";

/** Atualiza a data corrente, inclusive quando o painel permanece aberto após a meia-noite. */
export function useAdminClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}
