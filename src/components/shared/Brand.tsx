import { Wheat } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          inverted ? "bg-gold text-primary" : "bg-primary text-gold",
        )}
        aria-hidden
      >
        <Wheat className="h-5 w-5" />
      </span>
      <span className="font-display text-lg font-semibold leading-none tracking-tight">
        Padaria Digital
      </span>
    </span>
  );
}
