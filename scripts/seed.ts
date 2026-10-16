// Demo data for local development: two accounts sharing a room with a couple
// of links. Safe to run repeatedly; it skips whatever already exists.
//
//   bun run seed
//
// Runs outside SvelteKit, so it builds its own Better Auth instance over the
// same database (Bun loads DATABASE_PATH and BETTER_AUTH_* from .env).
import Database from "better-sqlite3";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { username } from "better-auth/plugins/username";
import { Kysely, SqliteDialect } from "kysely";
import type { DB } from "../src/lib/server/db.ts";
import { migrate } from "../src/lib/server/migrate.ts";

const PASSWORD = "echochamber";
const PEOPLE = [
  { name: "Alice", username: "alice" },
  { name: "Bob", username: "bob" },
];

const sqlite = new Database(process.env.DATABASE_PATH || "local.db");
sqlite.pragma("foreign_keys = ON");
const db = new Kysely<DB>({ dialect: new SqliteDialect({ database: sqlite }) });
const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: { db, type: "sqlite" },
  emailAndPassword: { enabled: true },
  plugins: [username()],
});

await (await getMigrations(auth.options)).runMigrations();
await migrate(db);

const ids: string[] = [];
for (const person of PEOPLE) {
  const existing = await db
    .selectFrom("user")
    .select("id")
    .where("username", "=", person.username)
    .executeTakeFirst();
  if (existing) {
    ids.push(existing.id);
    continue;
  }
  const { user } = await auth.api.signUpEmail({
    body: {
      ...person,
      displayUsername: person.username,
      email: `${person.username}@echochamber.test`,
      password: PASSWORD,
    },
  });
  ids.push(user.id);
}
const [alice, bob] = ids as [string, string];

const hasRoom = await db
  .selectFrom("room")
  .select("id")
  .where("created_by", "=", alice)
  .where("title", "=", "Demo room")
  .executeTakeFirst();
if (!hasRoom) {
  const roomId = crypto.randomUUID();
  const now = Date.now();
  const links = [
    { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", note: "a classic", author: alice },
    { url: "https://github.com/sveltejs/kit", note: "what this app is built with", author: bob },
  ];
  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("room")
      .values({
        id: roomId,
        title: "Demo room",
        created_by: alice,
        created_at: now,
        updated_at: now,
      })
      .execute();
    await tx
      .insertInto("room_member")
      .values([
        { room_id: roomId, user_id: alice, role: "admin", joined_at: now },
        { room_id: roomId, user_id: bob, role: "member", joined_at: now },
      ])
      .execute();
    for (const [i, link] of links.entries()) {
      const linkId = crypto.randomUUID();
      // Previews start pending; the dev server fetches them on startup.
      await tx
        .insertInto("link_preview")
        .values({ url: link.url, status: "pending" })
        .onConflict((oc) => oc.doNothing())
        .execute();
      await tx
        .insertInto("link")
        .values({
          id: linkId,
          room_id: roomId,
          author_id: link.author,
          url: link.url,
          note: link.note,
          created_at: now + i,
        })
        .execute();
      await tx
        .insertInto("comment")
        .values({
          id: crypto.randomUUID(),
          link_id: linkId,
          parent_id: null,
          author_id: link.author === alice ? bob : alice,
          body: link.author === alice ? "never gets old" : "nice",
          created_at: now + i + 1,
        })
        .execute();
    }
  });
}

console.log(`Seeded ${sqlite.name}. Sign in with either account:`);
for (const person of PEOPLE) console.log(`  ${person.username} / ${PASSWORD}`);
