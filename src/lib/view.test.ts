import { describe, expect, it } from "vitest";
import { parseView } from "./view.ts";

describe("parseView", () => {
  it("reads a saved gallery preference", () => {
    expect(parseView("gallery")).toBe("gallery");
  });

  it("falls back to the list for anything else", () => {
    expect(parseView(undefined)).toBe("list");
    expect(parseView("list")).toBe("list");
    expect(parseView("masonry")).toBe("list");
  });
});
