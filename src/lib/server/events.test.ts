import { describe, expect, it } from "vitest";
import { publish, userChanges } from "./events.ts";
import { createRoom } from "./rooms.ts";
import { addMember, createUser } from "./test-utils.ts";

/** Whether `next` settles within a few ms of the publishes before it. */
async function fired(next: Promise<IteratorResult<unknown>>) {
  const result = await Promise.race([next, new Promise((r) => setTimeout(() => r("pending"), 20))]);
  return result !== "pending";
}

describe("userChanges", () => {
  it("yields once immediately, then once per burst on the user's topics", async () => {
    const alice = await createUser();
    const roomId = await createRoom(alice.id, {});
    const abort = new AbortController();
    const it = userChanges(alice.id, abort.signal)[Symbol.asyncIterator]();
    expect((await it.next()).done).toBe(false);

    let next = it.next();
    publish(`room:${roomId}`);
    publish(`room:${roomId}`);
    expect(await fired(next)).toBe(true);

    next = it.next();
    publish(`user:${alice.id}`);
    expect(await fired(next)).toBe(true);

    abort.abort();
    expect(await it.next()).toEqual({ value: undefined, done: true });
  });

  it("ignores rooms and users it can't see", async () => {
    const [alice, bob] = [await createUser(), await createUser()];
    const bobsRoom = await createRoom(bob.id, {});
    const abort = new AbortController();
    const it = userChanges(alice.id, abort.signal)[Symbol.asyncIterator]();
    await it.next();

    const next = it.next();
    publish(`room:${bobsRoom}`, `user:${bob.id}`);
    expect(await fired(next)).toBe(false);
    abort.abort();
  });

  it("follows the user into rooms they join", async () => {
    const [alice, bob] = [await createUser(), await createUser()];
    const roomId = await createRoom(bob.id, {});
    const abort = new AbortController();
    const it = userChanges(alice.id, abort.signal)[Symbol.asyncIterator]();
    await it.next();

    // Joining publishes the joiner's user topic (see `roomChanged`).
    await addMember(roomId, alice.id, "member");
    let next = it.next();
    publish(`user:${alice.id}`);
    expect(await fired(next)).toBe(true);

    next = it.next();
    publish(`room:${roomId}`);
    expect(await fired(next)).toBe(true);
    abort.abort();
  });
});
