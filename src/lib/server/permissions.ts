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
  "member.invite": ["admin"],
  "member.kick": ["admin"],
  "member.setRole": ["admin"],
  "content.deleteAny": ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Action = keyof typeof PERMISSIONS;

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
    .select("role")
    .where("room_id", "=", roomId)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  if (!member) error(404, "Room not found");
  if (action && !can(member.role, action)) error(403, "You don't have permission to do that");
  return member.role;
}
