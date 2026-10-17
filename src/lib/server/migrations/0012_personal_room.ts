import { type Kysely, sql } from "kysely";

// Everyone has a personal room: theirs alone, pinned above their other rooms, and
// never deleted, left or shared (see permissions.ts). A trigger makes it whenever a
// user row is inserted, so every way of creating an account (Better Auth, the seed
// script, tests) gets one without remembering to.
//
// It's printed in the palette's first ink, which is what freshInk picks for a first room.

/** Make the personal room, and its admin membership, of each user (aliased `u`) matching `where`. */
function personalRooms(where: string) {
  const now = "CAST(unixepoch('subsec') * 1000 AS INTEGER)";
  // A random v4 UUID, since room ids are validated as UUIDs.
  const uuid = `lower(
    hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' ||
    substr('89ab', 1 + abs(random()) % 4, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))
  )`;
  return [
    `INSERT INTO room (id, title, personal_of, ink_a, ink_b, created_by, created_at, updated_at)
     SELECT ${uuid}, 'Personal', u.id, '#ff48b0', '#0078bf', u.id, ${now}, ${now}
     FROM "user" u WHERE ${where};`,
    `INSERT INTO room_member (room_id, user_id, role, joined_at, last_read_at)
     SELECT r.id, u.id, 'admin', ${now}, ${now}
     FROM "user" u JOIN room r ON r.personal_of = u.id WHERE ${where};`,
  ];
}

export async function up(db: Kysely<any>) {
  await db.schema
    .alterTable("room")
    .addColumn("personal_of", "text", (c) => c.references("user.id").onDelete("cascade"))
    .execute();
  await db.schema
    .createIndex("room_personal_of_idx")
    .unique()
    .on("room")
    .column("personal_of")
    .execute();
  const body = personalRooms("u.id = new.id").join("\n");
  await sql
    .raw(`CREATE TRIGGER user_personal_room AFTER INSERT ON "user" BEGIN ${body} END`)
    .execute(db);
  // Users who signed up before this.
  for (const statement of personalRooms("true")) await sql.raw(statement).execute(db);
}
