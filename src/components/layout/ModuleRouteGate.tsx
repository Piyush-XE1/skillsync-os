import { Navigate, Outlet } from "@tanstack/react-router";
import type { ModuleKey } from "@/lib/schema";
import { useAppStore, useHydrated } from "@/store/useAppStore";

/** Keep disabled workspaces out of routes without touching their local records. */
export function ModuleRouteGate({ module }: { module: ModuleKey }) {
  const hydrated = useHydrated();
  const enabled = useAppStore((state) => state.preferences.modules[module]);
  return hydrated && !enabled ? <Navigate to="/profile/modules" /> : <Outlet />;
}
