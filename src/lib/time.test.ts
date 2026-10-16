import { describe, expect, it } from "vitest";
import { timeAgo } from "./time.ts";

const now = Date.UTC(2026, 0, 10);
const ago = (ms: number) => timeAgo(now - ms, now);

describe("timeAgo", () => {
  it("reads naturally at each scale", () => {
    expect(ago(10_000)).toBe("just now");
    expect(ago(5 * 60_000)).toBe("5 minutes ago");
    expect(ago(60 * 60_000)).toBe("1 hour ago");
    expect(ago(25 * 60 * 60_000)).toBe("yesterday");
    expect(ago(400 * 24 * 60 * 60_000)).toBe("last year");
  });
});
