import { describe, it, expect } from "vitest";
import { isSafeUrl, safeHref } from "@/lib/url";

describe("url safety", () => {
  it("accepts absolute http(s) URLs", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
    expect(isSafeUrl("http://example.com/path?q=1#frag")).toBe(true);
    expect(isSafeUrl("https://github.com/user/repo")).toBe(true);
  });

  it("rejects dangerous schemes", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeUrl("vbscript:x")).toBe(false);
    expect(isSafeUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects relative or malformed URLs", () => {
    expect(isSafeUrl("")).toBe(false);
    expect(isSafeUrl("/local/path")).toBe(false);
    expect(isSafeUrl("not a url")).toBe(false);
    expect(isSafeUrl("//example.com")).toBe(false);
  });

  it("safeHref returns the URL when safe and '#' otherwise", () => {
    expect(safeHref("https://example.com")).toBe("https://example.com");
    expect(safeHref("javascript:alert(1)")).toBe("#");
    expect(safeHref("/relative")).toBe("#");
  });
});
