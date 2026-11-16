import { createFileRoute } from "@tanstack/react-router";
import { CounterCartProvider } from "@/contexts/CounterCartContext";
import { PointOfSale } from "@/components/admin/pos/PointOfSale";
export const Route = createFileRoute("/admin/balcao")({ component: CounterPage });
function CounterPage() {
  return (
    <CounterCartProvider>
      <PointOfSale />
    </CounterCartProvider>
  );
}
