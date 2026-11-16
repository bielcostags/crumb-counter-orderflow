import { createFileRoute, Link } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";

import { DemoNotice } from "@/components/shared/DemoNotice";
import { EmptyState } from "@/components/shared/States";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Área da equipe (demo) — Padaria Digital" },
      {
        name: "description",
        content: "Gestão de pedidos, produtos e balcão — acesso de demonstração.",
      },
      { property: "og:title", content: "Área da equipe (demo) — Padaria Digital" },
      {
        property: "og:description",
        content: "Gestão de pedidos, produtos e balcão — acesso de demonstração.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <DemoNotice />
      <EmptyState
        icon={LayoutDashboard}
        title="Área da equipe em construção"
        description="Painel, fila de pedidos, produtos, categorias e balcão ainda não foram concluídos nesta versão."
        action={
          <Button asChild variant="outline">
            <Link to="/">Voltar ao cardápio</Link>
          </Button>
        }
      />
    </div>
  );
}
