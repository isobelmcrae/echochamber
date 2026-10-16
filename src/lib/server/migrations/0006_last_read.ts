import type { Kysely } from "kysely";

// When each member last opened the room, for unread counts. Existing members
// start caught up; new members default to 0, so a room's history is new to them.
export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable("room_member")
    .addColumn("last_read_at", "integer", (c) => c.notNull().defaultTo(0))
    .execute();
  await db.updateTable("room_member").set({ last_read_at: Date.now() }).execute();
}
