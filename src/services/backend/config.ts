import { z } from "zod";

const remoteConfigSchema = z.object({
  VITE_SUPABASE_URL: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash
      );
    }),
  // Only the new public key format is accepted; no JWT/service_role/secret key.
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().regex(/^sb_publishable_[A-Za-z0-9_-]{20,}$/),
});
export type BackendPlan =
  { mode: "local" } | { mode: "supabase"; url: string; publishableKey: string };

/** Explicit input only. Does not read env, instantiate clients or switch the app's services. */
export function parseBackendPlan(env: Record<string, unknown>): BackendPlan {
  const mode = env["VITE_BACKEND_MODE"] ?? "local";
  if (mode === "local") return { mode };
  if (mode !== "supabase") throw new Error("Modo de backend inválido.");
  const parsed = remoteConfigSchema.safeParse(env);
  // Do not include input/credentials in diagnostic messages.
  if (!parsed.success) throw new Error("Configuração pública do Supabase ausente ou inválida.");
  return {
    mode,
    url: parsed.data.VITE_SUPABASE_URL,
    publishableKey: parsed.data.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}
