import { type Kysely, sql } from "kysely";

// The role an invitee joins with. Starting a room with someone invites them as
// an admin, so both people in a 1:1 can manage it.
export async function up(db: Kysely<unknown>) {
  await db.schema
    .alterTable("room_invite")
    .addColumn("role", "text", (c) =>
      c
        .notNull()
        .defaultTo("member")
        .check(sql`role in ('admin', 'member')`),
    )
    .execute();
}
