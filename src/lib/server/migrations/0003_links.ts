import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>) {
  // Unfurled metadata, keyed by normalized URL and shared across rooms.
  await db.schema
    .createTable("link_preview")
    .addColumn("url", "text", (c) => c.primaryKey())
    .addColumn("status", "text", (c) =>
      c.notNull().check(sql`status in ('pending', 'ok', 'failed')`),
    )
    .addColumn("title", "text")
    .addColumn("description", "text")
    .addColumn("image_url", "text")
    .addColumn("site_name", "text")
    .addColumn("fetched_at", "integer")
    .execute();

  await db.schema
    .createTable("link")
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("room_id", "text", (c) => c.notNull().references("room.id").onDelete("cascade"))
    .addColumn("author_id", "text", (c) => c.references("user.id").onDelete("set null"))
    .addColumn("url", "text", (c) => c.notNull())
    .addColumn("note", "text")
    .addColumn("created_at", "integer", (c) => c.notNull())
    .addColumn("edited_at", "integer")
    .execute();
  await db.schema
    .createIndex("link_room_created_idx")
    .on("link")
    .columns(["room_id", "created_at desc", "id desc"])
    .execute();
}
