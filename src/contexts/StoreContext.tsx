import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

import { fillMissingCatalogImages } from "@/lib/fill-catalog-images";
import { CATALOG_PRODUCT_IMAGES } from "@/data/catalog-product-images";
import type { AppServices } from "@/services/contracts";
import { localServices } from "@/services/local";
import { dataStore } from "@/services/local/store";
import type { StoreData } from "@/types";

interface StoreContextValue {
  /** `null` enquanto os dados locais não foram carregados (SSR/hidratação). */
  data: StoreData | null;
  services: AppServices;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const getServerSnapshot = () => null;

export function StoreProvider({ children }: { children: ReactNode }) {
  const data = useSyncExternalStore(dataStore.subscribe, dataStore.get, getServerSnapshot);
  useEffect(() => {
    if (!data) return;
    const updated = fillMissingCatalogImages(data, CATALOG_PRODUCT_IMAGES);
    if (updated !== data) dataStore.set(updated);
  }, [data]);
  return (
    <StoreContext.Provider value={{ data, services: localServices }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore deve ser usado dentro de <StoreProvider>.");
  return ctx;
}
