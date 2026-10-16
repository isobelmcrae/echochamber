import { error } from "@sveltejs/kit";
import { type ExpressionBuilder, sql } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/sqlite";
import { type DB, db } from "./db.ts";
import { publish, roomChanged } from "./events.ts";
import { requireMember, type Role } from "./permissions.ts";

// ── Username invites ───────────────────────────────────────────────────────

/** The user with this username (case- and @-insensitive), or a 404. */
export async function findByUsername(username: string) {
  const user = await db
    .selectFrom("user")
    .select("id")
    .where("username", "=", username.trim().replace(/^@/, "").toLowerCase())
    .executeTakeFirst();
  if (!user) error(404, `No one is called @${username.replace(/^@/, "")}`);
  return user;
}

export async function inviteByUsername(
  actorId: string,
  roomId: string,
  username: string,
  role: Role = "member",
) {
  await requireMember(roomId, actorId, "member.invite");
  const invitee = await findByUsername(username);

  const member = await db
    .selectFrom("room_member")
    .select("user_id")
    .where("room_id", "=", roomId)
    .where("user_id", "=", invitee.id)
    .executeTakeFirst();
  if (member) error(409, `@${username} is already in this room`);

  await db
    .insertInto("room_invite")
    .values({
      room_id: roomId,
      invitee_id: invitee.id,
      inviter_id: actorId,
      role,
      created_at: Date.now(),
    })
    .onConflict((oc) => oc.doNothing())
    .execute();
  publish(`room:${roomId}`, `user:${invitee.id}`);
}

const members = (eb: ExpressionBuilder<DB, "room">) =>
  jsonArrayFrom(
    eb
      .selectFrom("room_member")
      .innerJoin("user", "user.id", "room_member.user_id")
      .select(["user.id", "user.name"])
      .whereRef("room_member.room_id", "=", "room.id")
      .orderBy("room_member.joined_at"),
  ).as("members");

/** Invites waiting on the user, newest first. */
export async function listMyInvites(userId: string) {
  return db
    .selectFrom("room_invite")
    .innerJoin("room", "room.id", "room_invite.room_id")
    .leftJoin("user as inviter", "inviter.id", "room_invite.inviter_id")
    .select((eb) => [
      "room_invite.room_id",
      "room_invite.created_at",
      "room.title",
      "inviter.name as inviter_name",
      members(eb),
    ])
    .where("room_invite.invitee_id", "=", userId)
    .orderBy("room_invite.created_at", "desc")
    .execute();
}

export async function listRoomInvites(actorId: string, roomId: string) {
  await requireMember(roomId, actorId, "member.invite");
  return db
    .selectFrom("room_invite")
    .innerJoin("user", "user.id", "room_invite.invitee_id")
    .select(["user.id", "user.name", "user.username", "room_invite.created_at"])
    .where("room_invite.room_id", "=", roomId)
    .orderBy("room_invite.created_at")
    .execute();
}

/** Join a room you were invited to. Accepting again once you're in is a no-op. */
export async function acceptInvite(userId: string, roomId: string) {
  await db.transaction().execute(async (tx) => {
    const invite = await tx
      .deleteFrom("room_invite")
      .where("room_id", "=", roomId)
      .where("invitee_id", "=", userId)
      .returning("role")
      .executeTakeFirst();
    if (!invite) {
      const member = await tx
        .selectFrom("room_member")
        .select("user_id")
        .where("room_id", "=", roomId)
        .where("user_id", "=", userId)
        .executeTakeFirst();
      if (!member) error(404, "Invite not found");
      return;
    }
    await tx
      .insertInto("room_member")
      .values({ room_id: roomId, user_id: userId, role: invite.role, joined_at: Date.now() })
      .onConflict((oc) => oc.doNothing())
      .execute();
  });
  await roomChanged(roomId);
}

export async function declineInvite(userId: string, roomId: string) {
  await db
    .deleteFrom("room_invite")
    .where("room_id", "=", roomId)
    .where("invitee_id", "=", userId)
    .execute();
  publish(`room:${roomId}`, `user:${userId}`);
}

export async function cancelInvite(actorId: string, roomId: string, inviteeId: string) {
  await requireMember(roomId, actorId, "member.invite");
  await db
    .deleteFrom("room_invite")
    .where("room_id", "=", roomId)
    .where("invitee_id", "=", inviteeId)
    .execute();
  publish(`room:${roomId}`, `user:${inviteeId}`);
}

// ── Invite links ───────────────────────────────────────────────────────────

function newToken() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");
}

const usable = (eb: ExpressionBuilder<DB, "invite_token">, now: number) =>
  eb.and([
    eb("revoked_at", "is", null),
    eb.or([eb("expires_at", "is", null), eb("expires_at", ">", now)]),
    eb.or([eb("max_uses", "is", null), eb("use_count", "<", eb.ref("max_uses"))]),
  ]);

export async function createInviteLink(
  actorId: string,
  roomId: string,
  { expiresInHours, maxUses }: { expiresInHours?: number; maxUses?: number },
) {
  await requireMember(roomId, actorId, "member.invite");
  const now = Date.now();
  const link = {
    id: crypto.randomUUID(),
    room_id: roomId,
    token: newToken(),
    created_by: actorId,
    expires_at: expiresInHours ? now + expiresInHours * 60 * 60 * 1000 : null,
    max_uses: maxUses ?? null,
    created_at: now,
  };
  await db.insertInto("invite_token").values(link).execute();
  publish(`room:${roomId}`);
  return link;
}

/** The room's invite links that can still be used. */
export async function listInviteLinks(actorId: string, roomId: string) {
  await requireMember(roomId, actorId, "member.invite");
  return db
    .selectFrom("invite_token")
    .select(["id", "token", "expires_at", "max_uses", "use_count", "created_at"])
    .where("room_id", "=", roomId)
    .where((eb) => usable(eb, Date.now()))
    .orderBy("created_at", "desc")
    .execute();
}

export async function revokeInviteLink(actorId: string, roomId: string, linkId: string) {
  await requireMember(roomId, actorId, "member.invite");
  await db
    .updateTable("invite_token")
    .set({ revoked_at: Date.now() })
    .where("id", "=", linkId)
    .where("room_id", "=", roomId)
    .execute();
  publish(`room:${roomId}`);
}

async function findUsableLink(tx: typeof db, token: string) {
  const link = await tx
    .selectFrom("invite_token")
    .select((eb) => ["id", "room_id", usable(eb, Date.now()).as("usable")])
    .where("token", "=", token)
    .executeTakeFirst();
  if (!link) error(404, "This invite link doesn't exist");
  if (!link.usable) error(410, "This invite link has expired");
  return link;
}

/** What someone opening an invite link sees before joining. */
export async function previewInviteLink(token: string) {
  const { room_id } = await findUsableLink(db, token);
  return db
    .selectFrom("room")
    .select((eb) => ["room.id as room_id", "room.title", members(eb)])
    .where("room.id", "=", room_id)
    .executeTakeFirstOrThrow();
}

/** Join through an invite link; returns the room id. Members re-opening it don't use it up. */
export async function redeemInviteLink(userId: string, token: string) {
  const roomId = await db.transaction().execute(async (tx) => {
    const { id, room_id } = await tx
      .selectFrom("invite_token")
      .select(["id", "room_id"])
      .where("token", "=", token)
      .executeTakeFirst()
      .then((link) => link ?? error(404, "This invite link doesn't exist"));

    const { numInsertedOrUpdatedRows } = await tx
      .insertInto("room_member")
      .values({ room_id, user_id: userId, role: "member", joined_at: Date.now() })
      .onConflict((oc) => oc.doNothing())
      .executeTakeFirst();
    if (numInsertedOrUpdatedRows === 0n) return room_id; // already a member

    await findUsableLink(tx, token); // throws (rolling back the insert) if expired
    await tx
      .updateTable("invite_token")
      .set({ use_count: sql`use_count + 1` })
      .where("id", "=", id)
      .execute();
    await tx
      .deleteFrom("room_invite")
      .where("room_id", "=", room_id)
      .where("invitee_id", "=", userId)
      .execute();
    return room_id;
  });
  await roomChanged(roomId);
  return roomId;
}
