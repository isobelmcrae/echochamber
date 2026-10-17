import { command, form, query } from "$app/server";
import { invalid, isHttpError, redirect } from "@sveltejs/kit";
import * as v from "valibot";
import { Id } from "#lib/schemas.ts";
import { listMyInvites } from "#lib/server/invites.ts";
import { ROLES } from "#lib/server/permissions.ts";
import * as rooms from "#lib/server/rooms.ts";
import { requireUser } from "#lib/server/session.ts";

// Mutations publish change events (src/lib/server/events.ts), which the
// `changes` stream turns into refreshes of these reads (`refreshOnChange`).
// Forms submit with `form.submit().updates()` to skip the default
// refresh-everything round trip.

const Title = v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100)));

/** The signed-in user's rooms and pending invites. */
export const home = query(async () => {
  const me = requireUser();
  return { rooms: await rooms.listRooms(me.id), invites: await listMyInvites(me.id) };
});

export const room = query(Id, (roomId) => rooms.getRoom(roomId, requireUser().id));

export const markRead = command(Id, async (roomId) => {
  await rooms.markRead(requireUser().id, roomId);
});

export const createRoom = form(
  v.object({ title: Title, with: v.optional(v.pipe(v.string(), v.trim())) }),
  async ({ title, with: username }, issue) => {
    let roomId: string;
    try {
      roomId = await rooms.createRoom(requireUser().id, { title, with: username || undefined });
    } catch (e) {
      if (isHttpError(e, 404) || isHttpError(e, 400)) invalid(issue.with(e.body.message));
      throw e;
    }
    redirect(303, `/rooms/${roomId}`);
  },
);

export const renameRoom = form(
  v.object({ roomId: Id, title: Title }),
  async ({ roomId, title }) => {
    await rooms.renameRoom(requireUser().id, roomId, title ?? null);
  },
);

const Hex = v.pipe(v.string(), v.toLowerCase(), v.regex(/^#[0-9a-f]{6}$/, "Not a #rrggbb colour"));

export const setRoomInk = command(
  v.object({ roomId: Id, ink: v.object({ a: Hex, b: Hex }) }),
  async ({ roomId, ink }) => {
    await rooms.setRoomInk(requireUser().id, roomId, ink);
    // Sent back with the response, so the picker's optimistic overrides settle in one trip.
    void room(roomId).refresh();
    void home().refresh();
  },
);

const Member = v.object({ roomId: Id, userId: v.string() });

export const kickMember = command(Member, async ({ roomId, userId }) => {
  await rooms.kickMember(requireUser().id, roomId, userId);
});

export const setRole = command(
  v.object({ roomId: Id, userId: v.string(), role: v.picklist(ROLES) }),
  async ({ roomId, userId, role }) => {
    await rooms.setRole(requireUser().id, roomId, userId, role);
  },
);

export const leaveRoom = command(Id, async (roomId) => {
  await rooms.leaveRoom(requireUser().id, roomId);
});

export const deleteRoom = command(Id, async (roomId) => {
  await rooms.deleteRoom(requireUser().id, roomId);
});
