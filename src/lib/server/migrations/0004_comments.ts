import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("comment")
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("link_id", "text", (c) => c.notNull().references("link.id").onDelete("cascade"))
    // Replies to a deleted comment keep a tombstone parent, so this never cascades in practice.
    .addColumn("parent_id", "text", (c) => c.references("comment.id").onDelete("cascade"))
    .addColumn("author_id", "text", (c) => c.references("user.id").onDelete("set null"))
    .addColumn("body", "text", (c) => c.notNull())
    .addColumn("created_at", "integer", (c) => c.notNull())
    .addColumn("edited_at", "integer")
    .addColumn("deleted_at", "integer")
    .execute();
  await db.schema
    .createIndex("comment_link_created_idx")
    .on("comment")
    .columns(["link_id", "created_at"])
    .execute();
  await db.schema.createIndex("comment_parent_idx").on("comment").column("parent_id").execute();
}
