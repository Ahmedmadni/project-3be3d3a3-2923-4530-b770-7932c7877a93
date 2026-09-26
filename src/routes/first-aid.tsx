import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/first-aid")({ component: () => <Outlet /> });
