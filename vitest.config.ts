import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Dedicated Vitest config.
 *
 * We intentionally do NOT reuse `@lovable.dev/vite-tanstack-config` here: the
 * TanStack Start / nitro plugins it wires up are not relevant to running unit
 * tests and can interfere with Vitest's own Vite pipeline. The only integration
 * we need is the `@/*` → `src/*` path alias (via vite-tsconfig-paths), which is
 * what all source files import with.
 *
 * Environment is `node` by default (fast, DOM-free). Tests that touch the
 * browser (`window` / `localStorage`) — e.g. the zustand store — opt into jsdom
 * with a per-file `// @vitest-environment jsdom` comment.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**", "src/store/**", "src/hooks/**", "src/utils/**"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.d.ts",
        "src/lib/error-capture.ts",
        "src/lib/error-page.ts",
        "src/lib/lovable-error-reporting.ts",
        "src/lib/platform-files.ts",
        "src/lib/native/**",
        "src/lib/notifications/sw.ts",
        "src/lib/notifications/native-sync.ts",
        "src/lib/notifications/permission.ts",
        "src/lib/notifications/adapter.ts",
        "src/lib/routeTree.gen.ts",
        "src/routes/**",
      ],
    },
  },
});
