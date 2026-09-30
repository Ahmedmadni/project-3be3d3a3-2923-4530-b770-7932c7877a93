import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/first-aid")({
  staticData: { sitemap: false }, component: () => <Outlet /> });
