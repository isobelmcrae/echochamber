import { sql } from "kysely";
import { db } from "./db.ts";
import { publish } from "./events.ts";
import { unfurl } from "./unfurl.ts";

const RETRY_FAILED_AFTER = 24 * 60 * 60 * 1000;
const inFlight = new Map<string, Promise<void>>();

// Each fetch has its own deadline, and Node resolves hostnames on a few shared
// threads: started all at once (on startup, after a migration), fetches queue
// for them and time out, which reads as "unknown" rather than "broken".
const MAX_FETCHES = 4;
let fetching = 0;
const waiting: (() => void)[] = [];

async function limited<T>(task: () => Promise<T>) {
  if (fetching >= MAX_FETCHES) await new Promise<void>((resolve) => waiting.push(resolve));
  else fetching++;
  try {
    return await task();
  } finally {
    // Hand the slot straight to the next in line, or give it back.
    const next = waiting.shift();
    if (next) next();
    else fetching--;
  }
}

/**
 * Fetch the preview for a posted URL if it's new (pending) or failed long
 * enough ago, then tell every room that shared it. Resolves when done; callers
 * on the request path don't wait for it.
 */
export async function ensurePreview(url: string) {
  const running = inFlight.get(url);
  if (running) return running;
  const row = await db
    .selectFrom("link_preview")
    .select(["status", "fetched_at"])
    .where("url", "=", url)
    .executeTakeFirst();
  const stale = row?.status === "failed" && (row.fetched_at ?? 0) < Date.now() - RETRY_FAILED_AFTER;
  if (row?.status !== "pending" && !stale) return;

  const job = refresh(url).finally(() => inFlight.delete(url));
  inFlight.set(url, job);
  return job;
}

// Without a new preview, a row keeps the one it had (a refetch can fail where
// the first fetch worked), and only has nothing to show if it never had one.
const KEEP_STATUS = sql<
  "ok" | "failed"
>`case when title is not null or image_url is not null then 'ok' else 'failed' end`;

async function refresh(url: string) {
  const result = await limited(() => unfurl(url)).catch(() => null);
  const fetched_at = Date.now();
  const page_status = result?.page ?? undefined;
  await db
    .updateTable("link_preview")
    .set(
      result?.preview
        ? { status: "ok", ...result.preview, page_status: page_status ?? null, fetched_at }
        : { status: KEEP_STATUS, page_status, fetched_at },
    )
    .where("url", "=", url)
    .execute();
  const rooms = await db
    .selectFrom("link")
    .select("room_id")
    .distinct()
    .where("url", "=", url)
    .execute();
  publish(...rooms.map((r) => `room:${r.room_id}`));
}

/** On startup, pick up previews interrupted by a restart. */
export async function resumePendingPreviews() {
  const pending = await db
    .selectFrom("link_preview")
    .select("url")
    .where("status", "=", "pending")
    .execute();
  for (const { url } of pending) void ensurePreview(url);
}
