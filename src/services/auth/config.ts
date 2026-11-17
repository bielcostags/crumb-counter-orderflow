export function authMode(value: unknown): "demo" | "supabase" {
  if (value === undefined || value === "demo") return "demo";
  if (value === "supabase") return "supabase";
  throw new Error("Modo de autenticação inválido.");
}
export function authConfiguration(env: Record<string, unknown>) {
  if (authMode(env["AUTH_MODE"]) !== "supabase" || authMode(env["VITE_AUTH_MODE"]) !== "supabase")
    throw new Error("Autenticação real não está habilitada neste ambiente.");
  const local = env["AUTH_TARGET"] === "local";
  const url = env["SUPABASE_URL"];
  const key = env["SUPABASE_PUBLISHABLE_KEY"];
  const expected = local ? "http://127.0.0.1:54321" : "https://yzxsuoxthkbzbkcumauz.supabase.co";
  if (url !== expected || typeof key !== "string")
    throw new Error("Configuração de autenticação inválida.");
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key);
  if (local && !publicKey) {
    try {
      publicKey =
        JSON.parse(atob((key.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/"))).role ===
        "anon";
    } catch {
      publicKey = false;
    }
  }
  if (!publicKey) throw new Error("Use somente uma chave pública de autenticação.");
  return { url: expected, key, secure: !local };
}
export const isRealAuth = () => authMode(import.meta.env["VITE_AUTH_MODE"]) === "supabase";
