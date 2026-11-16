import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";

import { PublicLayout } from "@/components/public/PublicLayout";
import { EmptyState } from "@/components/shared/States";

export const Route = createFileRoute("/acompanhar")({
  head: () => ({
    meta: [
      { title: "Acompanhar pedido — Padaria Digital" },
      {
        name: "description",
        content: "Acompanhe o status do seu pedido pelo número (demonstração).",
      },
      { property: "og:title", content: "Acompanhar pedido — Padaria Digital" },
      { property: "og:description", content: "Acompanhe o status do seu pedido pelo número." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <EmptyState
          icon={ClipboardList}
          title="Acompanhamento em construção"
          description="Esta tela ainda não foi concluída no protótipo."
        />
      </div>
    </PublicLayout>
  );
}
