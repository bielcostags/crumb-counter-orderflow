import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { MAX_ITEM_QUANTITY, MAX_NOTES_LENGTH } from "@/lib/orders";
import { cartStore } from "@/services/local/store";
import type { CartLine, ID } from "@/types";

interface CartContextValue {
  /** `null` enquanto carrega. */
  lines: CartLine[] | null;
  itemCount: number;
  addItem: (productId: ID, quantity?: number) => void;
  setQuantity: (productId: ID, quantity: number) => void;
  setNotes: (productId: ID, notes: string) => void;
  removeItem: (productId: ID) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const getServerSnapshot = () => null;
const clampQty = (q: number) => Math.min(MAX_ITEM_QUANTITY, Math.max(1, Math.floor(q)));

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(cartStore.subscribe, cartStore.get, getServerSnapshot);

  const addItem = useCallback((productId: ID, quantity = 1) => {
    cartStore.set((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === productId ? { ...l, quantity: clampQty(l.quantity + quantity) } : l,
        );
      }
      return [...prev, { productId, quantity: clampQty(quantity) }];
    });
  }, []);

  const setQuantity = useCallback((productId: ID, quantity: number) => {
    cartStore.set((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, quantity: clampQty(quantity) } : l)),
    );
  }, []);

  const setNotes = useCallback((productId: ID, notes: string) => {
    cartStore.set((prev) =>
      prev.map((l) =>
        l.productId === productId ? { ...l, notes: notes.slice(0, MAX_NOTES_LENGTH) } : l,
      ),
    );
  }, []);

  const removeItem = useCallback((productId: ID) => {
    cartStore.set((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => cartStore.set([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      itemCount: lines?.reduce((s, l) => s + l.quantity, 0) ?? 0,
      addItem,
      setQuantity,
      setNotes,
      removeItem,
      clear,
    }),
    [lines, addItem, setQuantity, setNotes, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de <CartProvider>.");
  return ctx;
}
