import { describe, expect, it } from "vitest";
import { changes, publish } from "./events.ts";

describe("changes", () => {
  it("yields once immediately, then once per burst of changes", async () => {
    const abort = new AbortController();
    const it = changes(["room:a"], abort.signal)[Symbol.asyncIterator]();
    expect(await it.next()).toEqual({ value: undefined, done: false });

    const next = it.next();
    publish("room:a");
    publish("room:a");
    expect(await next).toEqual({ value: undefined, done: false });

    let woke = false;
    const after = it.next().then((r) => ((woke = true), r));
    publish("room:other");
    await new Promise((r) => setTimeout(r, 10));
    expect(woke).toBe(false);

    abort.abort();
    expect(await after).toEqual({ value: undefined, done: true });
  });

  it("listens to several topics", async () => {
    const abort = new AbortController();
    const it = changes(["user:1", "room:b"], abort.signal)[Symbol.asyncIterator]();
    await it.next();
    const next = it.next();
    publish("room:b");
    expect((await next).done).toBe(false);
    abort.abort();
  });
});
