import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/mock-test/$subject")({
  component: () => <Outlet />,
});
