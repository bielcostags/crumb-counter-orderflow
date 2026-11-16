import { useSyncExternalStore, type ReactNode } from "react";
import { counterCartStore } from "@/services/local/counter-store";
import { CounterCartContext, counterCartActions } from "./counter-cart";
const getServerSnapshot = () => null;
export function CounterCartProvider({ children }: { children: ReactNode }) {
  const draft = useSyncExternalStore(
    counterCartStore.subscribe,
    counterCartStore.get,
    getServerSnapshot,
  );
  return (
    <CounterCartContext.Provider value={{ draft, ...counterCartActions }}>
      {children}
    </CounterCartContext.Provider>
  );
}
