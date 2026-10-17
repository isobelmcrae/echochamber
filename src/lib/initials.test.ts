import { describe, expect, it } from "vitest";
import { initials } from "./initials.ts";

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("ada lovelace byron")).toBe("AL");
  });

  it("splits a room's comma-separated member names", () => {
    expect(initials("Ana, Ben")).toBe("AB");
  });

  it("keeps an emoji whole", () => {
    expect(initials("🦊 Fox")).toBe("🦊F");
  });

  it("returns nothing for a blank name", () => {
    expect(initials("  ")).toBe("");
  });
});
