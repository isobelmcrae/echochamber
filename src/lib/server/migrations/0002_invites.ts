import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>) {
  // Pending invites to a specific user. Rows are deleted on accept/decline.
  await db.schema
    .createTable("room_invite")
    .addColumn("room_id", "text", (c) => c.notNull().references("room.id").onDelete("cascade"))
    .addColumn("invitee_id", "text", (c) => c.notNull().references("user.id").onDelete("cascade"))
    .addColumn("inviter_id", "text", (c) => c.references("user.id").onDelete("set null"))
    .addColumn("created_at", "integer", (c) => c.notNull())
    .addPrimaryKeyConstraint("room_invite_pk", ["room_id", "invitee_id"])
    .execute();
  await db.schema
    .createIndex("room_invite_invitee_idx")
    .on("room_invite")
    .column("invitee_id")
    .execute();

  // Shareable invite links.
  await db.schema
    .createTable("invite_token")
    .addColumn("id", "text", (c) => c.primaryKey())
    .addColumn("room_id", "text", (c) => c.notNull().references("room.id").onDelete("cascade"))
    .addColumn("token", "text", (c) => c.notNull().unique())
    .addColumn("created_by", "text", (c) => c.references("user.id").onDelete("set null"))
    .addColumn("expires_at", "integer")
    .addColumn("max_uses", "integer")
    .addColumn("use_count", "integer", (c) => c.notNull().defaultTo(0))
    .addColumn("revoked_at", "integer")
    .addColumn("created_at", "integer", (c) => c.notNull())
    .execute();
  await db.schema
    .createIndex("invite_token_room_idx")
    .on("invite_token")
    .column("room_id")
    .execute();
}
