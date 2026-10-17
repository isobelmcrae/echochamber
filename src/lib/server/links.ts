import { error } from "@sveltejs/kit";
import type { ExpressionBuilder } from "kysely";
import { jsonObjectFrom } from "kysely/helpers/sqlite";
import { normalizeUrl } from "#lib/url.ts";
import { type DB, db } from "./db.ts";
import { publish, roomChanged } from "./events.ts";
import { can, requireMember } from "./permissions.ts";
import { ensurePreview } from "./previews.ts";

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
