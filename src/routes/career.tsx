import { createFileRoute } from "@tanstack/react-router";
import { ModuleRouteGate } from "@/components/layout/ModuleRouteGate";

export const Route = createFileRoute("/career")({
  component: () => <ModuleRouteGate module="career" />,
});
