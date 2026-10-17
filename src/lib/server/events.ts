import { EventEmitter } from "node:events";
import { db } from "./db.ts";

// In-process change notifications. Topics are `room:<id>` and `user:<id>`. A
// single Node process is assumed; running several would need a shared broker
// (e.g. Redis pub/sub) behind `publish` and `userChanges`.
const bus = new EventEmitter().setMaxListeners(0);

export function publish(...topics: string[]) {
  for (const topic of topics) bus.emit("change", topic);
}

async function topicsFor(userId: string) {
  const rooms = await db
    .selectFrom("room_member")
    .select("room_id")
    .where("user_id", "=", userId)
    .execute();
  return new Set([`user:${userId}`, ...rooms.map((r) => `room:${r.room_id}`)]);
}

/**
 * Yields once right away, then once after each change the user can see (their
 * own topic or any room they're in), merging bursts into one. Rooms are re-read
 * whenever the user's own topic fires, which joining or leaving one does. Ends
 * when `signal` aborts.
 */
export async function* userChanges(userId: string, signal: AbortSignal) {
  const own = `user:${userId}`;
  // Listen before the first read so nothing published meanwhile is missed.
  let topics = new Set([own]);
  let dirty = true;
  let stale = true;
  let wake: (() => void) | undefined;
  const onChange = (topic: string) => {
    if (!topics.has(topic)) return;
    dirty = true;
    if (topic === own) stale = true;
    wake?.();
  };
  const onAbort = () => wake?.();
  bus.on("change", onChange);
  signal.addEventListener("abort", onAbort);
  try {
    while (!signal.aborted) {
      if (!dirty) await new Promise<void>((resolve) => (wake = resolve));
      if (signal.aborted) return;
      dirty = false;
      if (stale) {
        stale = false;
        topics = await topicsFor(userId);
      }
      yield;
    }
  } finally {
    bus.off("change", onChange);
    signal.removeEventListener("abort", onAbort);
  }
}

/** Notify the room's viewers and every member's room list (plus `alsoUsers`, e.g. someone just removed). */
export async function roomChanged(roomId: string, alsoUsers: string[] = []) {
  const members = await db
    .selectFrom("room_member")
    .select("user_id")
    .where("room_id", "=", roomId)
    .execute();
  const users = new Set([...members.map((m) => m.user_id), ...alsoUsers]);
  publish(`room:${roomId}`, ...[...users].map((id) => `user:${id}`));
}
