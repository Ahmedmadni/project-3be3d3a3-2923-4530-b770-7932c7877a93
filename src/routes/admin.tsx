import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin")({
  staticData: { sitemap: "exclude-subtree" },
  component: () => <AdminShell><Outlet /></AdminShell>,
});
