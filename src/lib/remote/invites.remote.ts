import { command, form, query } from "$app/server";
import { invalid, isHttpError } from "@sveltejs/kit";
import * as v from "valibot";
import * as invites from "#lib/server/invites.ts";
import { requireUser } from "#lib/server/session.ts";
import { Id } from "#lib/schemas.ts";

export const acceptInvite = command(Id, async (roomId) => {
  await invites.acceptInvite(requireUser().id, roomId);
});

export const declineInvite = command(Id, async (roomId) => {
  await invites.declineInvite(requireUser().id, roomId);
});

/** Pending username invites and live invite links, for the room's admins. */
export const roomInvites = query(Id, async (roomId) => {
  const me = requireUser();
  return {
    pending: await invites.listRoomInvites(me.id, roomId),
    links: await invites.listInviteLinks(me.id, roomId),
  };
});

export const inviteUser = form(
  v.object({
    roomId: Id,
    username: v.pipe(v.string(), v.trim(), v.minLength(1, "Enter a username")),
  }),
  async ({ roomId, username }, issue) => {
    try {
      await invites.inviteByUsername(requireUser().id, roomId, username);
    } catch (e) {
      // Unknown user or already a member: show it on the field.
      if (isHttpError(e, 404) || isHttpError(e, 409)) invalid(issue.username(e.body.message));
      throw e;
    }
  },
);

export const cancelInvite = command(
  v.object({ roomId: Id, userId: v.string() }),
  async ({ roomId, userId }) => {
    await invites.cancelInvite(requireUser().id, roomId, userId);
  },
);

export const createInviteLink = form(
  v.object({
    roomId: Id,
    expiresInHours: v.optional(v.picklist(["", "24", "168"]), ""),
    maxUses: v.optional(v.picklist(["", "1", "5", "25"]), ""),
  }),
  async ({ roomId, expiresInHours, maxUses }) => {
    await invites.createInviteLink(requireUser().id, roomId, {
      expiresInHours: Number(expiresInHours) || undefined,
      maxUses: Number(maxUses) || undefined,
    });
  },
);

export const revokeInviteLink = command(
  v.object({ roomId: Id, linkId: Id }),
  async ({ roomId, linkId }) => {
    await invites.revokeInviteLink(requireUser().id, roomId, linkId);
  },
);

export const invitePreview = query(v.string(), async (token) => invites.previewInviteLink(token));

export const joinWithLink = command(v.string(), async (token) =>
  invites.redeemInviteLink(requireUser().id, token),
);
