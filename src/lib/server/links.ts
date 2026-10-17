import { error } from "@sveltejs/kit";
import type { ExpressionBuilder } from "kysely";
import { jsonObjectFrom } from "kysely/helpers/sqlite";
import { normalizeUrl } from "#lib/url.ts";
import { type DB, db } from "./db.ts";
import { publish, roomChanged } from "./events.ts";
import { can, requireMember } from "./permissions.ts";
import { ensurePreview } from "./previews.ts";
import { listRooms } from "./rooms.ts";

function cleanNote(note: string | null | undefined) {
  return note?.trim() || null;
}

const author = (eb: ExpressionBuilder<DB, "link">) =>
  jsonObjectFrom(
    eb
      .selectFrom("user")
      .select(["user.id", "user.name", "user.username", "user.image"])
      .whereRef("user.id", "=", "link.author_id"),
  ).as("author");

const preview = (eb: ExpressionBuilder<DB, "link">) =>
  jsonObjectFrom(
    eb
      .selectFrom("link_preview")
      .select(["status", "title", "description", "image_url", "site_name", "frameable"])
      .whereRef("link_preview.url", "=", "link.url"),
  ).as("preview");

const commentCount = (eb: ExpressionBuilder<DB, "link">) =>
  eb
    .selectFrom("comment")
    .select((eb) => eb.fn.countAll<number>().as("n"))
    .whereRef("comment.link_id", "=", "link.id")
    .where("comment.deleted_at", "is", null)
    .as("comment_count");

function selectLinks() {
  return db
    .selectFrom("link")
    .select((eb) => [
      "link.id",
      "link.room_id",
      "link.url",
      "link.note",
      "link.created_at",
      "link.edited_at",
      author(eb),
      preview(eb),
      commentCount(eb),
    ]);
}

/**
 * Links that are new to the user: posted by someone else to one of their rooms
 * since they last read it, and not viewed one by one since.
 */
function selectUnseen(userId: string) {
  return selectLinks()
    .innerJoin("room_member as me", (j) =>
      j.onRef("me.room_id", "=", "link.room_id").on("me.user_id", "=", userId),
    )
    .whereRef("link.created_at", ">", "me.last_read_at")
    .where("link.author_id", "is not", userId)
    .where(({ not, exists, selectFrom }) =>
      not(
        exists(
          selectFrom("link_seen")
            .select("link_seen.link_id")
            .whereRef("link_seen.link_id", "=", "link.id")
            .where("link_seen.user_id", "=", userId),
        ),
      ),
    );
}

/**
 * The user's unseen links grouped by room, the room with the newest one first,
 * newest first within each. Capped to the newest `limit` links.
 */
export async function listQueue(userId: string, { limit = 200 } = {}) {
  const links = await selectUnseen(userId)
    .orderBy("link.created_at", "desc")
    .orderBy("link.id", "desc")
    .limit(limit)
    .execute();
  const rooms = new Map((await listRooms(userId)).map((r) => [r.id, r]));
  const groups = new Map<string, { room: Room; links: typeof links }>();
  for (const link of links) {
    const room = rooms.get(link.room_id);
    if (!room) continue;
    const group = groups.get(room.id) ?? { room, links: [] };
    groups.set(room.id, group);
    group.links.push(link);
  }
  return [...groups.values()];
}

type Room = Awaited<ReturnType<typeof listRooms>>[number];

/** Mark one link seen, dropping it from the queue and its room's unread count. */
export async function markSeen(userId: string, linkId: string) {
  await linkForActor(userId, linkId);
  // Only links that were new to the user, so viewing old ones doesn't notify anyone.
  if (!(await selectUnseen(userId).where("link.id", "=", linkId).executeTakeFirst())) return;
  await db
    .insertInto("link_seen")
    .values({ user_id: userId, link_id: linkId, seen_at: Date.now() })
    .onConflict((oc) => oc.doNothing())
    .execute();
  publish(`user:${userId}`);
}

/** Post a link to a room. Returns the new link's id and its (normalized) URL. */
export async function postLink(
  actorId: string,
  roomId: string,
  input: { url: string; note?: string | null },
) {
  await requireMember(roomId, actorId, "link.create");
  const url = normalizeUrl(input.url);
  if (!url) error(400, "That doesn't look like a web link");

  const id = crypto.randomUUID();
  const now = Date.now();
  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("link")
      .values({
        id,
        room_id: roomId,
        author_id: actorId,
        url,
        note: cleanNote(input.note),
        created_at: now,
      })
      .execute();
    await tx
      .insertInto("link_preview")
      .values({ url, status: "pending" })
      .onConflict((oc) => oc.doNothing())
      .execute();
    await tx.updateTable("room").set({ updated_at: now }).where("id", "=", roomId).execute();
  });
  await roomChanged(roomId); // also moves the room up everyone's list
  void ensurePreview(url);
  return { id, url };
}

/** A page of the room's links, newest first. `cursor` comes from the previous page. */
export async function listLinks(
  userId: string,
  roomId: string,
  { limit = 30, cursor }: { limit?: number; cursor?: string } = {},
) {
  await requireMember(roomId, userId);
  let query = selectLinks().where("link.room_id", "=", roomId);
  if (cursor) {
    const [at, id] = [Number(cursor.split(":")[0]), cursor.split(":")[1] ?? ""];
    query = query.where((eb) =>
      eb.or([
        eb("link.created_at", "<", at),
        eb.and([eb("link.created_at", "=", at), eb("link.id", "<", id)]),
      ]),
    );
  }
  const rows = await query
    .orderBy("link.created_at", "desc")
    .orderBy("link.id", "desc")
    .limit(limit + 1)
    .execute();
  const links = rows.slice(0, limit);
  const last = links.at(-1);
  return {
    links,
    nextCursor: rows.length > limit && last ? `${last.created_at}:${last.id}` : null,
  };
}

export async function getLink(userId: string, linkId: string) {
  const link = await selectLinks().where("link.id", "=", linkId).executeTakeFirst();
  if (!link) error(404, "Link not found");
  await requireMember(link.room_id, userId);
  return link;
}

/** The link's room and author, after checking the actor is a member. */
async function linkForActor(actorId: string, linkId: string) {
  const link = await db
    .selectFrom("link")
    .select(["room_id", "author_id"])
    .where("id", "=", linkId)
    .executeTakeFirst();
  if (!link) error(404, "Link not found");
  const role = await requireMember(link.room_id, actorId);
  return { ...link, role };
}

export async function editLinkNote(actorId: string, linkId: string, note: string | null) {
  const link = await linkForActor(actorId, linkId);
  if (link.author_id !== actorId) error(403, "You can only edit your own links");
  await db
    .updateTable("link")
    .set({ note: cleanNote(note), edited_at: Date.now() })
    .where("id", "=", linkId)
    .execute();
  publish(`room:${link.room_id}`);
  return link.room_id;
}

export async function deleteLink(actorId: string, linkId: string) {
  const link = await linkForActor(actorId, linkId);
  if (link.author_id !== actorId && !can(link.role, "content.deleteAny")) {
    error(403, "You can only delete your own links");
  }
  await db.deleteFrom("link").where("id", "=", linkId).execute();
  publish(`room:${link.room_id}`);
  return link.room_id;
}
