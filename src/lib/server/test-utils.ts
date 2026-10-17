import { auth } from "./auth.ts";
import { db } from "./db.ts";
import type { Role } from "./permissions.ts";
import { listRooms } from "./rooms.ts";

let counter = 0;

/**
 * Create a fresh user through Better Auth's adapter. (`auth.api.signUpEmail`
 * needs a SvelteKit request for its cookie hook, which tests don't have.)
 */
export async function createUser(name = "user") {
  const username = `${name}_${++counter}`;
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.createUser(
    {
      name,
      username,
      displayUsername: username,
      email: `${username}@example.test`,
      emailVerified: false,
    },
    { method: "email-password" },
  );
  return { id: user.id, username };
}

export async function addMember(roomId: string, userId: string, role: Role) {
  await db
    .insertInto("room_member")
    .values({ room_id: roomId, user_id: userId, role, joined_at: Date.now() })
    .execute();
}

/** The user's rooms besides their personal one, in `listRooms` order. */
export async function sharedRooms(userId: string) {
  return (await listRooms(userId)).filter((room) => !room.personal_of);
}
