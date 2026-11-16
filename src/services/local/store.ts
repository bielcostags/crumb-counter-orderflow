import { createSeedStore, STORE_VERSION } from "@/data/mock";
import { createPersistentStore } from "@/lib/persistent-store";
import type { CartLine, StoreData } from "@/types";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export const STORE_KEY = "padaria-digital:demo:store:v1";
export const CART_KEY = "padaria-digital:demo:cart:v1";
export const ADMIN_SESSION_KEY = "padaria-digital:demo:admin-session:v1";

export const dataStore = createPersistentStore<StoreData>(
  STORE_KEY,
  () => createSeedStore(new Date()),
  (raw) => {
    if (
      isObj(raw) &&
      raw.version === STORE_VERSION &&
      Array.isArray(raw.categories) &&
      Array.isArray(raw.products) &&
      Array.isArray(raw.orders)
    ) {
      return raw as unknown as StoreData;
    }
    return null;
  },
);

export const cartStore = createPersistentStore<CartLine[]>(
  CART_KEY,
  () => [],
  (raw) =>
    Array.isArray(raw)
      ? (raw.filter(
          (l) => isObj(l) && typeof l.productId === "string" && typeof l.quantity === "number",
        ) as CartLine[])
      : null,
);

export interface AdminSession {
  signedIn: boolean;
  /** Sempre "demo": não há autenticação real nesta fase. */
  mode: "demo";
}

export const adminSessionStore = createPersistentStore<AdminSession>(
  ADMIN_SESSION_KEY,
  () => ({ signedIn: false, mode: "demo" }),
  (raw) => (isObj(raw) && typeof raw.signedIn === "boolean" ? (raw as unknown as AdminSession) : null),
);
