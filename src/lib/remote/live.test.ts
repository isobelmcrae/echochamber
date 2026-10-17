import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// A live query holds an HTTP connection until the browser garbage-collects it,
// not when the page stops reading it. Browsers allow six connections per host
// over HTTP/1.1, so a few live queries per room stalled navigation after a few
// rooms. One stream per tab (`changes`) tells every other read when to refresh.
describe("remote functions", () => {
  it("stream through the single `changes` live query", () => {
    const dir = new URL(".", import.meta.url);
    const live = readdirSync(dir)
      .filter((f) => f.endsWith(".remote.ts"))
      .flatMap((f) => {
        const count = readFileSync(new URL(f, dir), "utf8").match(/\bquery\.live\(/g)?.length ?? 0;
        return count ? [`${f}: ${count}`] : [];
      });
    expect(live).toEqual(["changes.remote.ts: 1"]);
  });
});
