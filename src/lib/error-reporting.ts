/** Local diagnostics only: no external telemetry or platform globals. */
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  console.error("[Vila Rica] Falha na aplicação", context, error);
}
