import { describe, expect, it } from "vitest";
import {
  assertLinkedProject,
  preparationCommand,
  SUPABASE_PROJECT_REF,
} from "../../scripts/supabase/project";

describe("alvo Supabase externo", () => {
  it("aceita somente o ref autorizado, com newline da CLI", () => {
    expect(() => assertLinkedProject(`${SUPABASE_PROJECT_REF}\n`)).not.toThrow();
  });
  it.each(["", "another-project", "yzxsuoxthkbzbkcumaux"])(
    "bloqueia vínculo ausente/incorreto %s",
    (ref) => expect(() => assertLinkedProject(ref)).toThrow(),
  );
  it("vincula apenas o projeto aprovado", () =>
    expect(preparationCommand("link")).toEqual(["link", "--project-ref", SUPABASE_PROJECT_REF]));
  it("dry run fixa o alvo e impede gravação de migrações e Vault", () =>
    expect(preparationCommand("dry-run")).toEqual([
      "db",
      "push",
      `--remote=${SUPABASE_PROJECT_REF}`,
      "--dry-run",
      "--skip-vault",
    ]));
  it.each(["push", "reset", "apply", "seed", "login", "dry-run --yes"])(
    "rejeita operação não autorizada %s",
    (mode) => expect(() => preparationCommand(mode)).toThrow(),
  );
});
