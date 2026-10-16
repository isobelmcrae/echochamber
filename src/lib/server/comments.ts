import { error } from "@sveltejs/kit";
import { jsonObjectFrom } from "kysely/helpers/sqlite";
import { db } from "./db.ts";
import { publish } from "./events.ts";
import { can, requireMember } from "./permissions.ts";

const MAX_BODY = 4000;

function cleanBody(body: string) {
  const text = body.trim();
  if (!text) error(400, "Write something first");
  if (text.length > MAX_BODY) error(400, `Comments can be at most ${MAX_BODY} characters`);
  return text;
}

async function linkRoom(linkId: string) {
  const link = await db
    .selectFrom("link")
    .select("room_id")
    .where("id", "=", linkId)
    .executeTakeFirst();
  if (!link) error(404, "Link not found");
  return link.room_id;
}

/** A live (not deleted) comment, its room, and the actor's role there. */
async function commentForActor(actorId: string, commentId: string) {
  const comment = await db
    .selectFrom("comment")
    .innerJoin("link", "link.id", "comment.link_id")
    .select(["comment.author_id", "comment.link_id", "link.room_id"])
    .where("comment.id", "=", commentId)
    .where("comment.deleted_at", "is", null)
    .executeTakeFirst();
  if (!comment) error(404, "Comment not found");
  const role = await requireMember(comment.room_id, actorId);
  return { ...comment, role };
}

export async function addComment(
  actorId: string,
  linkId: string,
  input: { body: string; parentId?: string | null },
) {
  const roomId = await linkRoom(linkId);
  await requireMember(roomId, actorId, "comment.create");
  const body = cleanBody(input.body);
  if (input.parentId) {
    const parent = await db
      .selectFrom("comment")
      .select("link_id")
      .where("id", "=", input.parentId)
      .executeTakeFirst();
    if (parent?.link_id !== linkId) error(400, "You can only reply to comments on the same link");
  }
  const comment = {
    id: crypto.randomUUID(),
    link_id: linkId,
    parent_id: input.parentId ?? null,
    author_id: actorId,
    body,
    created_at: Date.now(),
  };
  await db.insertInto("comment").values(comment).execute();
  publish(`room:${roomId}`);
  return { id: comment.id, roomId };
}

/** Every comment on the link, flat and chronological. Deleted ones are blanked tombstones. */
export async function listComments(userId: string, linkId: string) {
  await requireMember(await linkRoom(linkId), userId);
  const rows = await db
    .selectFrom("comment")
    .select((eb) => [
      "comment.id",
      "comment.parent_id",
      "comment.body",
      "comment.created_at",
      "comment.edited_at",
      "comment.deleted_at",
      jsonObjectFrom(
        eb
          .selectFrom("user")
          .select(["user.id", "user.name", "user.username", "user.image"])
          .whereRef("user.id", "=", "comment.author_id"),
      ).as("author"),
    ])
    .where("comment.link_id", "=", linkId)
    .orderBy("comment.created_at")
    .orderBy("comment.id")
    .execute();
  return rows.map(({ deleted_at, ...c }) =>
    deleted_at ? { ...c, body: "", author: null, deleted: true } : { ...c, deleted: false },
  );
}

export async function editComment(actorId: string, commentId: string, body: string) {
  const comment = await commentForActor(actorId, commentId);
  if (comment.author_id !== actorId) error(403, "You can only edit your own comments");
  await db
    .updateTable("comment")
    .set({ body: cleanBody(body), edited_at: Date.now() })
    .where("id", "=", commentId)
    .execute();
  publish(`room:${comment.room_id}`);
  return comment;
}

/**
 * Delete a comment. One with replies becomes a tombstone so the thread stays
 * readable; tombstones are removed once their last reply goes.
 */
export async function deleteComment(actorId: string, commentId: string) {
  const comment = await commentForActor(actorId, commentId);
  if (comment.author_id !== actorId && !can(comment.role, "content.deleteAny")) {
    error(403, "You can only delete your own comments");
  }
  await db.transaction().execute(async (tx) => {
    const hasReplies = (id: string) =>
      tx.selectFrom("comment").select("id").where("parent_id", "=", id).executeTakeFirst();

    if (await hasReplies(commentId)) {
      await tx
        .updateTable("comment")
        .set({ body: "", author_id: null, deleted_at: Date.now() })
        .where("id", "=", commentId)
        .execute();
      return;
    }

    // Delete it, then walk up removing tombstones it was the last reply of.
    let id: string | null = commentId;
    while (id) {
      const row = await tx
        .deleteFrom("comment")
        .where("id", "=", id)
        .returning("parent_id")
        .executeTakeFirst();
      id = null;
      if (!row?.parent_id) break;
      const parent = await tx
        .selectFrom("comment")
        .select(["id", "deleted_at"])
        .where("id", "=", row.parent_id)
        .executeTakeFirst();
      if (parent?.deleted_at && !(await hasReplies(parent.id))) id = parent.id;
    }
  });
  publish(`room:${comment.room_id}`);
  return comment;
}
