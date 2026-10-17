import { error } from "@sveltejs/kit";
import { db } from "./db.ts";

export const ROLES = ["admin", "member"] as const;
export type Role = (typeof ROLES)[number];

// Who may do what inside a room. Ownership rules (editing your own content)
// live with the content, not here.
const PERMISSIONS = {
  "link.create": ["admin", "member"],
  "comment.create": ["admin", "member"],
  "room.update": ["admin"],
  "room.delete": ["admin"],
  "room.leave": ["admin", "member"],
  "member.invite": ["admin"],
  "member.kick": ["admin"],
  "member.setRole": ["admin"],
  "content.deleteAny": ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Action = keyof typeof PERMISSIONS;

// A personal room is only ever its owner's, so no one can share it or get rid of it.
const NOT_IN_PERSONAL_ROOMS: ReadonlySet<Action> = new Set([
  "member.invite",
  "room.delete",
  "room.leave",
]);

export function can(role: Role, action: Action) {
  return (PERMISSIONS[action] as readonly Role[]).includes(role);
}

/**
 * The caller's role in the room. Non-members get a 404 so room ids don't leak;
 * members without `action` permission get a 403.
 */
export async function requireMember(roomId: string, userId: string, action?: Action) {
  const member = await db
    .selectFrom("room_member")
    .innerJoin("room", "room.id", "room_member.room_id")
    .select(["room_member.role", "room.personal_of"])
    .where("room_member.room_id", "=", roomId)
    .where("room_member.user_id", "=", userId)
    .executeTakeFirst();
  if (!member) error(404, "Room not found");
  if (action && !can(member.role, action)) error(403, "You don't have permission to do that");
  if (action && member.personal_of && NOT_IN_PERSONAL_ROOMS.has(action)) {
    error(403, "Your personal room is just for you");
  }
  return member.role;
}
