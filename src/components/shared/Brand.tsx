import { cn } from "@/lib/utils";

/** Identificação textual provisória; substituir pela arte oficial somente quando fornecida. */
export function BrandMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-52 flex-col gap-1",
        inverted ? "text-gold-soft" : "text-primary",
        className,
      )}
    >
      <span className="font-display text-xl font-semibold leading-none tracking-tight sm:text-2xl">
        Vila Rica
      </span>
      <span className="text-[9px] font-medium leading-snug sm:text-[10px]">
        Padaria e Confeitaria Artesanal
      </span>
    </span>
  );
}
