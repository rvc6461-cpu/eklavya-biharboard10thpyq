import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/mock-test")({
  component: () => <Outlet />,
});
