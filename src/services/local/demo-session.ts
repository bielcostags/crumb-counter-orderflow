/** Contas públicas e fictícias da apresentação; não constituem segurança real. */
export type DemoRole = "admin" | "funcionario";
export interface DemoIdentity {
  id: string;
  email: string;
  name: string;
  role: DemoRole;
}
export const DEMO_ACCOUNTS = [
  {
    id: "demo-admin",
    email: "admin@vilarica.demo",
    name: "Administrador",
    role: "admin",
    password: "Admin@Demo2026",
  },
  {
    id: "demo-funcionario",
    email: "funcionario@vilarica.demo",
    name: "Funcionário",
    role: "funcionario",
    password: "Funcionario@Demo2026",
  },
] as const;
export function authenticateDemo(email: string, password: string): DemoIdentity {
  const account = DEMO_ACCOUNTS.find(
    (a) => a.email === email.trim().toLowerCase() && a.password === password,
  );
  if (!account) throw new Error("E-mail ou senha incorretos.");
  return { id: account.id, email: account.email, name: account.name, role: account.role };
}
export function parseDemoIdentity(raw: unknown): DemoIdentity | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const account = DEMO_ACCOUNTS.find(
    (a) => a.id === value["id"] && a.email === value["email"] && a.role === value["role"],
  );
  return account
    ? { id: account.id, email: account.email, name: account.name, role: account.role }
    : null;
}
export function mayAccessDemo(identity: DemoIdentity | null | undefined, path: string): boolean {
  if (!identity) return false;
  return identity.role === "admin"
    ? path !== "/admin/funcionarios"
    : /^\/admin\/(pedidos|balcao)\/?$/.test(path);
}
