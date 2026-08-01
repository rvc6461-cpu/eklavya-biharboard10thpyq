import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/practice/$subject/$chapter")({
  component: () => <Outlet />,
});
