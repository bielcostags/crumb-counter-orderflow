import { parseDemoIdentity, type DemoIdentity } from "./demo-session";
import { createSeedStore, STORE_VERSION } from "@/data/mock";
import { createPersistentStore } from "@/lib/persistent-store";
import type { CartLine, StoreData } from "@/types";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export const STORE_KEY = "padaria-digital:demo:store:v1";
export const CART_KEY = "padaria-digital:demo:cart:v1";
export const ADMIN_SESSION_KEY = "padaria-digital:demo:admin-session:v1";

/** Parser compartilhado pela carga inicial e testes de reidratação. */
export function parseStoreData(raw: unknown): StoreData | null {
  if (
    isObj(raw) &&
    raw["version"] === STORE_VERSION &&
    Array.isArray(raw["categories"]) &&
    Array.isArray(raw["products"]) &&
    Array.isArray(raw["orders"])
  )
    return raw as unknown as StoreData;
  return null;
}

export const dataStore = createPersistentStore<StoreData>(
  STORE_KEY,
  () => createSeedStore(new Date()),
  parseStoreData,
);

export const cartStore = createPersistentStore<CartLine[]>(
  CART_KEY,
  () => [],
  (raw) =>
    Array.isArray(raw)
      ? (raw.filter(
          (l) =>
            isObj(l) && typeof l["productId"] === "string" && typeof l["quantity"] === "number",
        ) as CartLine[])
      : null,
);

export interface AdminSession {
  signedIn: boolean;
  identity?: DemoIdentity;
  /** Sempre "demo": não há autenticação real nesta fase. */
  mode: "demo";
}

export const adminSessionStore = createPersistentStore<AdminSession>(
  ADMIN_SESSION_KEY,
  () => ({ signedIn: false, mode: "demo" }),
  (raw) => {
    if (!isObj(raw) || raw["mode"] !== "demo" || raw["signedIn"] !== true) return null;
    const identity = parseDemoIdentity(raw["identity"]);
    return identity ? { signedIn: true, mode: "demo", identity } : null;
  },
);
