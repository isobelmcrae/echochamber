import { error } from "@sveltejs/kit";
import { jsonArrayFrom } from "kysely/helpers/sqlite";
import { db } from "./db.ts";
import { publish, roomChanged } from "./events.ts";
import { findByUsername } from "./invites.ts";
import { requireMember, type Role } from "./permissions.ts";

function cleanTitle(title: string | null | undefined) {
  return title?.trim() || null;
}

/** Create a room, optionally inviting someone to it as a fellow admin (e.g. a 1:1). */
export async function createRoom(
  actorId: string,
  { title, with: username }: { title?: string | null; with?: string },
) {
  const invitee = username ? await findByUsername(username) : null;
  if (invitee?.id === actorId) error(400, "You're already in your own room");
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("room")
      .values({
        id,
        title: cleanTitle(title),
        created_by: actorId,
        created_at: now,
        updated_at: now,
      })
      .execute();
    await tx
      .insertInto("room_member")
      .values({ room_id: id, user_id: actorId, role: "admin", joined_at: now })
      .execute();
    if (invitee) {
      await tx
        .insertInto("room_invite")
        .values({
          room_id: id,
          invitee_id: invitee.id,
          inviter_id: actorId,
          role: "admin",
          created_at: now,
        })
        .execute();
    }
  });
  publish(`user:${actorId}`, ...(invitee ? [`user:${invitee.id}`] : []));
  return id;
}

/** The user's rooms, most recently active first, with every member for display. */
export async function listRooms(userId: string) {
  return db
    .selectFrom("room")
    .innerJoin("room_member as me", (j) =>
      j.onRef("me.room_id", "=", "room.id").on("me.user_id", "=", userId),
    )
    .select((eb) => [
      "room.id",
      "room.title",
      "room.updated_at",
      "me.role",
      jsonArrayFrom(
        eb
          .selectFrom("room_member")
          .innerJoin("user", "user.id", "room_member.user_id")
          .select(["user.id", "user.name", "user.username"])
          .whereRef("room_member.room_id", "=", "room.id")
          .orderBy("room_member.joined_at"),
      ).as("members"),
    ])
    .orderBy("room.updated_at", "desc")
    .execute();
}

export async function getRoom(roomId: string, userId: string) {
  const role = await requireMember(roomId, userId);
  const room = await db
    .selectFrom("room")
    .select((eb) => [
      "room.id",
      "room.title",
      jsonArrayFrom(
        eb
          .selectFrom("room_member")
          .innerJoin("user", "user.id", "room_member.user_id")
          .select(["user.id", "user.name", "user.username", "user.image", "room_member.role"])
          .whereRef("room_member.room_id", "=", "room.id")
          .orderBy("room_member.joined_at"),
      ).as("members"),
    ])
    .where("room.id", "=", roomId)
    .executeTakeFirstOrThrow();
  return { ...room, role };
}

export async function renameRoom(actorId: string, roomId: string, title: string | null) {
  await requireMember(roomId, actorId, "room.update");
  await db
    .updateTable("room")
    .set({ title: cleanTitle(title), updated_at: Date.now() })
    .where("id", "=", roomId)
    .execute();
  await roomChanged(roomId);
}

export async function deleteRoom(actorId: string, roomId: string) {
  await requireMember(roomId, actorId, "room.delete");
  const members = await db
    .selectFrom("room_member")
    .select("user_id")
    .where("room_id", "=", roomId)
    .execute();
  await db.deleteFrom("room").where("id", "=", roomId).execute();
  publish(`room:${roomId}`, ...members.map((m) => `user:${m.user_id}`));
}

export async function kickMember(actorId: string, roomId: string, targetId: string) {
  await requireMember(roomId, actorId, "member.kick");
  if (actorId === targetId) error(400, "Leave the room instead of kicking yourself");
  // The actor is an admin who stays, so this never removes the last admin.
  await db
    .deleteFrom("room_member")
    .where("room_id", "=", roomId)
    .where("user_id", "=", targetId)
    .execute();
  await roomChanged(roomId, [targetId]);
}

export async function setRole(actorId: string, roomId: string, targetId: string, role: Role) {
  await requireMember(roomId, actorId, "member.setRole");
  await db.transaction().execute(async (tx) => {
    const target = await tx
      .selectFrom("room_member")
      .select("role")
      .where("room_id", "=", roomId)
      .where("user_id", "=", targetId)
      .executeTakeFirst();
    if (!target) error(404, "Member not found");
    if (target.role === "admin" && role !== "admin" && (await adminCount(tx, roomId)) === 1) {
      error(409, "A room needs at least one admin; promote someone else first");
    }
    await tx
      .updateTable("room_member")
      .set({ role })
      .where("room_id", "=", roomId)
      .where("user_id", "=", targetId)
      .execute();
  });
  await roomChanged(roomId);
}

/** Leave a room. The last member leaving deletes it; the last admin can't leave others behind. */
export async function leaveRoom(userId: string, roomId: string) {
  const role = await requireMember(roomId, userId);
  await db.transaction().execute(async (tx) => {
    const { members } = await tx
      .selectFrom("room_member")
      .select((eb) => eb.fn.countAll<number>().as("members"))
      .where("room_id", "=", roomId)
      .executeTakeFirstOrThrow();
    if (members === 1) {
      await tx.deleteFrom("room").where("id", "=", roomId).execute();
      return;
    }
    if (role === "admin" && (await adminCount(tx, roomId)) === 1) {
      error(409, "You're the only admin; promote someone else before leaving");
    }
    await tx
      .deleteFrom("room_member")
      .where("room_id", "=", roomId)
      .where("user_id", "=", userId)
      .execute();
  });
  await roomChanged(roomId, [userId]);
}

async function adminCount(tx: typeof db, roomId: string) {
  const { admins } = await tx
    .selectFrom("room_member")
    .select((eb) => eb.fn.countAll<number>().as("admins"))
    .where("room_id", "=", roomId)
    .where("role", "=", "admin")
    .executeTakeFirstOrThrow();
  return admins;
}
