import { useState } from "react";
import { cn } from "@/lib/utils";

/** Arte oficial original, sem recorte, filtros ou alteração de cores. */
export function BrandLogo({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src="/images/brand/logo.jpeg"
      alt="Vila Rica — Padaria e Confeitaria Artesanal"
      width={1600}
      height={1333}
      onError={() => setFailed(true)}
      className={cn("h-12 w-14 shrink-0 object-contain", className)}
    />
  );
}

export function BrandMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-60 items-center gap-2",
        inverted ? "text-gold-soft" : "text-primary",
        className,
      )}
    >
      <BrandLogo />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-display text-lg font-semibold leading-none tracking-tight sm:text-xl">
          Vila Rica
        </span>
        <span className="text-[9px] font-medium leading-snug sm:text-[10px]">
          Padaria e Confeitaria Artesanal
        </span>
      </span>
    </span>
  );
}
