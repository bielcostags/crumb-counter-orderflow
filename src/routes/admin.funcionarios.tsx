import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { LoadingBlock } from "@/components/shared/States";
const StaffManagement = lazy(() =>
  import("@/components/admin/auth/StaffManagement").then((module) => ({
    default: module.StaffManagement,
  })),
);
import { isRealAuth } from "@/services/auth/config";
export const Route = createFileRoute("/admin/funcionarios")({
  component: () =>
    isRealAuth() ? (
      <Suspense fallback={<LoadingBlock />}>
        <StaffManagement />
      </Suspense>
    ) : (
      <p>Gestão de funcionários disponível somente no ambiente de autenticação real.</p>
    ),
});
