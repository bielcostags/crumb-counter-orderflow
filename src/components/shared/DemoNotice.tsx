import { FlaskConical } from "lucide-react";

import { cn } from "@/lib/utils";

export function DemoNotice({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-gold bg-gold-soft px-3 py-2 text-sm text-primary",
        className,
      )}
    >
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>
        <strong className="font-semibold">Demonstração.</strong>{" "}
        {compact
          ? "Use apenas dados fictícios. Não adequado para produção."
          : "Use apenas dados fictícios — nada é enviado a servidores, pagamentos não são processados e os dados ficam somente neste navegador. Esta versão não é adequada para produção."}
      </p>
    </div>
  );
}
