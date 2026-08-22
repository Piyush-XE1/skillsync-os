import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/learn")({
  component: () => <Outlet />,
});
