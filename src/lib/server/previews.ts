import { sql } from "kysely";
import { db } from "./db.ts";
import { publish } from "./events.ts";
import { unfurl } from "./unfurl.ts";

const RETRY_FAILED_AFTER = 24 * 60 * 60 * 1000;
const inFlight = new Map<string, Promise<void>>();

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
  const result = await unfurl(url).catch(() => null);
  const fetched_at = Date.now();
  const frameable =
    result?.frameable == null ? undefined : result.frameable ? (1 as const) : (0 as const);
  await db
    .updateTable("link_preview")
    .set(
      result?.preview
        ? { status: "ok", ...result.preview, frameable: frameable ?? null, fetched_at }
        : { status: KEEP_STATUS, frameable, fetched_at },
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
