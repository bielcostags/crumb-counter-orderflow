/** Non-secret project identity; never infer a target from arbitrary environment variables. */
export const SUPABASE_PROJECT_REF = "yzxsuoxthkbzbkcumauz";
export const SUPABASE_PROJECT_NAME = "vila-rica-dev";
export function assertLinkedProject(ref: string): void {
  if (ref.trim() !== SUPABASE_PROJECT_REF) {
    throw new Error(
      "Vínculo Supabase ausente ou incorreto. Vincule exclusivamente vila-rica-dev antes de continuar.",
    );
  }
}
export function preparationCommand(mode: string): string[] {
  if (mode === "link") return ["link", "--project-ref", SUPABASE_PROJECT_REF];
  if (mode === "dry-run")
    return ["db", "push", `--remote=${SUPABASE_PROJECT_REF}`, "--dry-run", "--skip-vault"];
  throw new Error("Operação não permitida: apenas link ou dry-run.");
}
