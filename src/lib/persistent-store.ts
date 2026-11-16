/**
 * Store externo mínimo com persistência em localStorage, usado com
 * useSyncExternalStore. No servidor (SSR) o snapshot é sempre `null`
 * (estado "carregando"), evitando divergência de hidratação.
 * Armazena APENAS dados fictícios de demonstração.
 */
export interface PersistentStore<T> {
  get(): T;
  set(updater: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
  reset(): void;
}

export function createPersistentStore<T>(
  key: string,
  init: () => T,
  parse: (raw: unknown) => T | null,
): PersistentStore<T> {
  let state: T | undefined;
  const listeners = new Set<() => void>();

  const read = (): T => {
    if (typeof window === "undefined") return init();
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = parse(JSON.parse(raw));
        if (parsed !== null) return parsed;
      }
    } catch (err) {
      console.warn(`[demo] Não foi possível ler "${key}" do armazenamento local.`, err);
    }
    const fresh = init();
    write(fresh);
    return fresh;
  };

  const write = (value: T) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`[demo] Não foi possível salvar "${key}" no armazenamento local.`, err);
    }
  };

  const emit = () => listeners.forEach((l) => l());

  const onStorage = (e: StorageEvent) => {
    // Sincroniza abas do MESMO navegador (não há sincronização entre dispositivos).
    if (e.key === key) {
      state = read();
      emit();
    }
  };

  return {
    get() {
      if (state === undefined) state = read();
      return state;
    },
    set(updater) {
      const prev = this.get();
      state = typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
      write(state);
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1 && typeof window !== "undefined") {
        window.addEventListener("storage", onStorage);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== "undefined") {
          window.removeEventListener("storage", onStorage);
        }
      };
    },
    reset() {
      state = init();
      write(state);
      emit();
    },
  };
}
