import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next.ts";

describe("safeNext", () => {
  it("keeps same-origin paths", () => {
    expect(safeNext("/rooms/abc?x=1")).toBe("/rooms/abc?x=1");
  });

  it("rejects anything that could leave the site", () => {
    for (const next of [
      null,
      "",
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "javascript:alert(1)",
    ]) {
      expect(safeNext(next)).toBe("/");
    }
  });
});
