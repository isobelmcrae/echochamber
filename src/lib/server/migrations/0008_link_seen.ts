import type { Kysely } from "kysely";

// Links a member has viewed one by one (from the home queue) before reading
// their whole room, so the queue and unread counts can skip them.
export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("link_seen")
    .addColumn("user_id", "text", (c) => c.notNull().references("user.id").onDelete("cascade"))
    .addColumn("link_id", "text", (c) => c.notNull().references("link.id").onDelete("cascade"))
    .addColumn("seen_at", "integer", (c) => c.notNull())
    .addPrimaryKeyConstraint("link_seen_pk", ["user_id", "link_id"])
    .execute();
}
