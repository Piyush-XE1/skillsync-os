/**
 * Shared Vitest setup (loaded for every test file).
 *
 * jsdom does not implement `matchMedia`, which a few components (breakpoint
 * hooks, CountUp) call. Provide a minimal, inert implementation so mounting
 * them in tests does not throw.
 */
// Enable React's test `act` environment for component mount tests.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => {
    const mql: MediaQueryList = {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
    return mql;
  }) as typeof window.matchMedia;
}
