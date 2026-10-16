import { EventEmitter } from "node:events";
import { db } from "./db.ts";

// In-process change notifications for live queries. Topics are `room:<id>` and
// `user:<id>`. A single Node process is assumed; running several would need a
// shared broker (e.g. Redis pub/sub) behind the same two functions.
const bus = new EventEmitter().setMaxListeners(0);

export function publish(...topics: string[]) {
  for (const topic of topics) bus.emit(topic);
}

/**
 * Yields once right away, then once after each change on any topic, merging
 * bursts into one. Ends when `signal` aborts.
 */
export async function* changes(topics: string[], signal: AbortSignal) {
  let dirty = true;
  let wake: (() => void) | undefined;
  const onChange = () => {
    dirty = true;
    wake?.();
  };
  const onAbort = () => wake?.();
  for (const topic of topics) bus.on(topic, onChange);
  signal.addEventListener("abort", onAbort);
  try {
    while (!signal.aborted) {
      if (!dirty) await new Promise<void>((resolve) => (wake = resolve));
      if (signal.aborted) return;
      dirty = false;
      yield;
    }
  } finally {
    for (const topic of topics) bus.off(topic, onChange);
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
