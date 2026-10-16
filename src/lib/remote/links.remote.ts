import { command, form, query } from "$app/server";
import { invalid, isHttpError } from "@sveltejs/kit";
import * as v from "valibot";
import * as comments from "#lib/server/comments.ts";
import * as links from "#lib/server/links.ts";
import { live } from "#lib/server/live.ts";
import { requireUser } from "#lib/server/session.ts";
import { Id } from "#lib/schemas.ts";

const Note = v.optional(v.pipe(v.string(), v.trim(), v.maxLength(1000)));
const Body = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "Write something first"),
  v.maxLength(4000),
);

/** The newest page of a room's links, kept live. Older pages come from `olderLinks`. */
export const feed = query.live(Id, (roomId) => {
  const me = requireUser();
  return live([`room:${roomId}`], () => links.listLinks(me.id, roomId));
});

export const olderLinks = query(
  v.object({ roomId: Id, cursor: v.string() }),
  ({ roomId, cursor }) => links.listLinks(requireUser().id, roomId, { cursor }),
);

export const postLink = form(
  v.object({
    roomId: Id,
    url: v.pipe(v.string(), v.trim(), v.minLength(1, "Paste a link")),
    note: Note,
  }),
  async ({ roomId, url, note }, issue) => {
    try {
      await links.postLink(requireUser().id, roomId, { url, note });
    } catch (e) {
      if (isHttpError(e, 400)) invalid(issue.url(e.body.message));
      throw e;
    }
  },
);

export const editLinkNote = command(
  v.object({ linkId: Id, note: Note }),
  async ({ linkId, note }) => {
    await links.editLinkNote(requireUser().id, linkId, note ?? null);
  },
);

export const deleteLink = command(Id, async (linkId) => {
  await links.deleteLink(requireUser().id, linkId);
});

/** A link and its flat, chronological comments, kept live. */
export const thread = query.live(Id, (linkId) => {
  const me = requireUser();
  return live(
    async () => [`room:${(await links.getLink(me.id, linkId)).room_id}`],
    async () => ({
      link: await links.getLink(me.id, linkId),
      comments: await comments.listComments(me.id, linkId),
    }),
  );
});

export const addComment = form(
  v.object({ linkId: Id, parentId: v.optional(Id), body: Body }),
  async ({ linkId, parentId, body }) => {
    await comments.addComment(requireUser().id, linkId, { body, parentId });
  },
);

export const editComment = command(
  v.object({ commentId: Id, body: Body }),
  async ({ commentId, body }) => {
    await comments.editComment(requireUser().id, commentId, body);
  },
);

export const deleteComment = command(Id, async (commentId) => {
  await comments.deleteComment(requireUser().id, commentId);
});
