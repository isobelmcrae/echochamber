import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("room")
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("title", "text")
    .addColumn("created_by", "text", (c) => c.references("user.id").onDelete("set null"))
    .addColumn("created_at", "integer", (c) => c.notNull())
    .addColumn("updated_at", "integer", (c) => c.notNull())
    .execute();

  await db.schema
    .createTable("room_member")
    .addColumn("room_id", "text", (c) => c.notNull().references("room.id").onDelete("cascade"))
    .addColumn("user_id", "text", (c) => c.notNull().references("user.id").onDelete("cascade"))
    .addColumn("role", "text", (c) => c.notNull().check(sql`role in ('admin', 'member')`))
    .addColumn("joined_at", "integer", (c) => c.notNull())
    .addPrimaryKeyConstraint("room_member_pk", ["room_id", "user_id"])
    .execute();

  await db.schema.createIndex("room_member_user_idx").on("room_member").column("user_id").execute();
}
