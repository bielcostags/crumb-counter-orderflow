import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MAX_ITEM_QUANTITY } from "@/lib/orders";

interface Props {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
}

export function QuantityStepper({ value, onChange, label, min = 1 }: Props) {
  return (
    <div
      className="inline-flex items-center rounded-lg border bg-card"
      role="group"
      aria-label={`Quantidade de ${label}`}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={`Diminuir quantidade de ${label}`}
      >
        <Minus />
      </Button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_ITEM_QUANTITY}
        aria-label={`Aumentar quantidade de ${label}`}
      >
        <Plus />
      </Button>
    </div>
  );
}
