import {
  Outlet,
  Link,
  createRootRoute,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useMemo, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { AppBackground } from "@/components/layout/backgrounds";
import { AppLaunchScreen } from "@/components/layout/AppLaunchScreen";
import { OnboardingFocusSheet } from "@/components/layout/OnboardingFocusSheet";
import { QuickCaptureSheet } from "@/components/layout/QuickCaptureSheet";
import { NotificationRunner } from "@/components/notifications/NotificationRunner";
import { BackupRunner } from "@/components/backup/BackupRunner";
import { ThemeManager, APPEARANCE_INIT_SCRIPT } from "@/hooks/use-theme";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="editorial-kicker mb-3">Error / 404</div>
        <h1 className="font-editorial text-[clamp(4.5rem,18vw,8rem)] font-medium leading-none tracking-[-0.06em] text-primary-glow">
          404
        </h1>
        <h2 className="font-editorial mt-4 text-[26px] font-normal tracking-[-0.03em] text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="font-numerical pressable inline-flex h-10 items-center justify-center rounded-[5px] border border-primary bg-primary px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-foreground transition-colors hover:bg-primary-glow"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  // Memoised: a fresh Error per render would retrigger the report effect below.
  const normalized = useMemo(
    () => (error instanceof Error ? error : new Error(String(error))),
    [error],
  );
  console.error(normalized);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(normalized, { boundary: "tanstack_root_error_component" });
  }, [normalized]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="editorial-kicker mb-3">System notice</div>
        <h1 className="font-editorial text-[30px] font-normal tracking-[-0.035em] text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="font-numerical pressable inline-flex h-10 items-center justify-center rounded-[5px] border border-primary bg-primary px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-foreground transition-colors hover:bg-primary-glow"
          >
            Try again
          </button>
          <a
            href="/"
            className="font-numerical pressable inline-flex h-10 items-center justify-center rounded-[5px] border border-border-strong bg-background px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-surface-2"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  // SkillSync is a local-first mobile app; render the app on the client so
  // persisted device data and browser-only mobile behavior never break SSR.
  ssr: false,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, interactive-widget=resizes-content",
      },
      { name: "theme-color", content: "#08080A" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "SkillSync" },
      { title: "SkillSync" },
      {
        name: "description",
        content:
          "A local-first personal operating system for identity, focus, and deliberate practice.",
      },
      { property: "og:title", content: "SkillSync OS" },
      {
        property: "og:description",
        content: "A private personal monograph, with the wider tools to practise what matters.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SkillSync OS" },
      {
        name: "twitter:description",
        content:
          "A local-first personal operating system for identity, focus, and deliberate practice.",
      },
      { name: "twitter:image", content: "/og.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "64x64" },
      { rel: "icon", href: "/icon-512.png", type: "image/png", sizes: "512x512" },
      { rel: "apple-touch-icon", href: "/icon-512.png", sizes: "512x512" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: the fixed appearance and rendering-quality
    // classes are owned by the pre-paint script below (and ThemeManager
    // afterwards), not by React, so the canvas arrives with zero flash.
    <html lang="en" className="dark monograph" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_INIT_SCRIPT }} />
      </head>
      <body className="min-h-[100dvh] bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <>
      <ThemeManager />
      <AppBackground />
      <AppLaunchScreen />
      <OnboardingFocusSheet />
      <QuickCaptureSheet />
      <NotificationRunner />
      <BackupRunner />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster />
    </>
  );
}
