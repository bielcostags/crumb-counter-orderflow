import { createFileRoute } from "@tanstack/react-router";
import { AdminCategories } from "@/components/admin/AdminCategories";
export const Route = createFileRoute("/admin/categorias")({ component: AdminCategories });
