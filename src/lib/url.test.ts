import { describe, expect, it } from "vitest";
import { normalizeUrl } from "./url.ts";

describe("normalizeUrl", () => {
  it("accepts http(s) links, trimming and dropping the fragment", () => {
    expect(normalizeUrl("  https://Example.com/a?b=1#frag ")).toBe("https://example.com/a?b=1");
  });

  it("adds https:// when the scheme is missing", () => {
    expect(normalizeUrl("youtube.com/watch?v=abc")).toBe("https://youtube.com/watch?v=abc");
  });

  it("strips tracking parameters but keeps meaningful ones", () => {
    expect(
      normalizeUrl("https://www.instagram.com/reel/XYZ/?igsh=abc&utm_source=ig_web&fbclid=1"),
    ).toBe("https://www.instagram.com/reel/XYZ/");
    expect(normalizeUrl("https://youtu.be/abc?si=track&t=42")).toBe("https://youtu.be/abc?t=42");
  });

  it("rejects non-web and malformed input", () => {
    for (const bad of ["", "javascript:alert(1)", "ftp://x.test/f", "not a url", "mailto:a@b.c"]) {
      expect(normalizeUrl(bad)).toBeNull();
    }
  });
});
