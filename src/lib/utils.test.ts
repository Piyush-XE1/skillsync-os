import { describe, it, expect } from "vitest";
import { cn, errorMessage, isAbortError } from "@/lib/utils";

describe("utils", () => {
  it("cn merges class names and dedupes conflicts", () => {
    expect(cn("a", "b")).toBe("a b");
    // tailwind-merge resolves the conflicting padding class
    expect(cn("p-2", "p-4")).toBe("p-4");
    const skip = false;
    expect(cn("a", skip && "b", "c")).toBe("a c");
  });

  it("errorMessage returns a readable message for various throws", () => {
    expect(errorMessage(new Error("boom"), "fallback")).toBe("boom");
    expect(errorMessage("raw string", "fallback")).toBe("raw string");
    expect(errorMessage(undefined, "fallback")).toBe("fallback");
    expect(errorMessage(null, "fallback")).toBe("fallback");
    expect(errorMessage({}, "fallback")).toBe("fallback");
  });

  it("isAbortError identifies only DOM AbortError", () => {
    expect(isAbortError(new DOMException("aborted", "AbortError"))).toBe(true);
    expect(isAbortError(new Error("aborted"))).toBe(false);
    expect(isAbortError("aborted")).toBe(false);
  });
});
