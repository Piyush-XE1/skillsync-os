import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function DefaultErrorComponent({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "";
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-5 text-center text-foreground">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {message || "Please refresh and try again."}
        </p>
      </div>
    </div>
  );
}

export const getRouter = () => {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
  });
};
