import { fireEvent, screen } from "@testing-library/react";
import { authenticateDemo } from "@/services/local/demo-session";
export const demoAdminSession = {
  signedIn: true,
  mode: "demo",
  identity: authenticateDemo("admin@vilarica.demo", "Admin@Demo2026"),
} as const;
export const demoEmployeeSession = {
  signedIn: true,
  mode: "demo",
  identity: authenticateDemo("funcionario@vilarica.demo", "Funcionario@Demo2026"),
} as const;
export function fillDemoLogin(employee = false) {
  fireEvent.change(screen.getByLabelText("E-mail"), {
    target: { value: employee ? "funcionario@vilarica.demo" : "admin@vilarica.demo" },
  });
  fireEvent.change(screen.getByLabelText("Senha"), {
    target: { value: employee ? "Funcionario@Demo2026" : "Admin@Demo2026" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
}
