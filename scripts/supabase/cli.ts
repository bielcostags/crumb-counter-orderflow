import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  assertLinkedProject,
  preparationCommand,
  SUPABASE_PROJECT_NAME,
  SUPABASE_PROJECT_REF,
} from "./project";

const root = fileURLToPath(new URL("../../", import.meta.url));
try {
  const args = process.argv.slice(2);
  const mode = args[0];
  if (args.length !== 1 || !mode)
    throw new Error(
      "Informe somente check, link ou dry-run; argumentos adicionais são bloqueados.",
    );
  if (mode === "check" || mode === "dry-run") {
    let ref = "";
    try {
      ref = readFileSync(new URL("../../supabase/.temp/project-ref", import.meta.url), "utf8");
    } catch {
      /* The assertion fails closed. */
    }
    assertLinkedProject(ref);
  }
  if (mode === "check") {
    console.info(
      `Vínculo local confirmado: ${SUPABASE_PROJECT_NAME} (${SUPABASE_PROJECT_REF}). Nenhuma consulta ao banco.`,
    );
  } else {
    const command = preparationCommand(mode);
    const result = spawnSync("bunx", ["--no-install", "supabase", ...command], {
      cwd: root,
      stdio: "inherit",
    });
    if (result.error) throw new Error("Não foi possível executar a CLI Supabase instalada.");
    process.exitCode = result.status ?? 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falha na preparação Supabase.");
  process.exitCode = 1;
}
