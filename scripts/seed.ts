// Demo data for local development: a handful of accounts sharing a few rooms
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
import { INKS } from "../src/lib/ink.ts";
import type { DB } from "../src/lib/server/db.ts";
import { migrate } from "../src/lib/server/migrate.ts";

const PASSWORD = "echochamber";
const PEOPLE = [
  { name: "Alice", username: "alice" },
  { name: "Bob", username: "bob" },
  { name: "Sam", username: "sam" },
  { name: "Priya", username: "priya" },
  { name: "Jules", username: "jules" },
  { name: "Marco", username: "marco" },
];
type Username = (typeof PEOPLE)[number]["username"];

// The first member creates the room and is its admin. A room without a title is a 1:1.
const ROOMS: {
  title: string | null;
  members: Username[];
  links: { url: string; note?: string; by: Username; reply?: { by: Username; body: string } }[];
}[] = [
  {
    title: "Demo room",
    members: ["alice", "bob"],
    links: [
      {
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        note: "a classic",
        by: "alice",
        reply: { by: "bob", body: "never gets old" },
      },
      {
        url: "https://github.com/sveltejs/kit",
        note: "what this app is built with",
        by: "bob",
        reply: { by: "alice", body: "nice" },
      },
    ],
  },
  {
    title: "film club",
    members: ["priya", "alice", "bob", "jules"],
    links: [
      {
        url: "https://en.wikipedia.org/wiki/The_Grand_Budapest_Hotel",
        note: "rewatch this weekend?",
        by: "priya",
        reply: { by: "jules", body: "only if we do moonrise kingdom after" },
      },
      { url: "https://www.criterion.com/current", by: "jules" },
    ],
  },
  {
    title: "climbing crew",
    members: ["marco", "priya", "sam"],
    links: [
      {
        url: "https://en.wikipedia.org/wiki/Bouldering",
        note: "for the newbies",
        by: "marco",
        reply: { by: "sam", body: "who are you calling a newbie" },
      },
    ],
  },
  {
    title: null,
    members: ["sam", "alice"],
    links: [
      {
        url: "https://en.wikipedia.org/wiki/Khruangbin",
        note: "for the drive saturday",
        by: "sam",
      },
    ],
  },
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

const ids = new Map<Username, string>();
for (const person of PEOPLE) {
  const existing = await db
    .selectFrom("user")
    .select("id")
    .where("username", "=", person.username)
    .executeTakeFirst();
  if (existing) {
    ids.set(person.username, existing.id);
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
  ids.set(person.username, user.id);
}
const id = (username: Username) => ids.get(username)!;

for (const [n, room] of ROOMS.entries()) {
  const [owner, ...others] = room.members.map(id) as [string, ...string[]];
  // A room is already seeded when its creator has one with the same title (or the same 1:1 partner).
  const existing = await db
    .selectFrom("room")
    .select("room.id")
    .where("created_by", "=", owner)
    .where((eb) =>
      room.title === null
        ? eb.and([
            eb("title", "is", null),
            eb.exists(
              eb
                .selectFrom("room_member")
                .select("room_member.user_id")
                .whereRef("room_member.room_id", "=", "room.id")
                .where("room_member.user_id", "=", others[0]!),
            ),
          ])
        : eb("title", "=", room.title),
    )
    .executeTakeFirst();
  if (existing) continue;

  const roomId = crypto.randomUUID();
  // Members joined a day ago, so the links below land in their queues as unseen.
  const now = Date.now();
  const joined = now - 24 * 60 * 60 * 1000;
  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("room")
      .values({
        id: roomId,
        title: room.title,
        ink_a: INKS[n % INKS.length]!.a,
        ink_b: INKS[n % INKS.length]!.b,
        created_by: owner,
        created_at: joined,
        updated_at: now,
      })
      .execute();
    await tx
      .insertInto("room_member")
      .values([
        { room_id: roomId, user_id: owner, role: "admin", joined_at: joined },
        // In a 1:1 both people are admins, as when the app creates one.
        ...others.map((user_id) => ({
          room_id: roomId,
          user_id,
          role: room.title === null ? ("admin" as const) : ("member" as const),
          joined_at: joined,
        })),
      ])
      .execute();
    for (const [i, link] of room.links.entries()) {
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
          author_id: id(link.by),
          url: link.url,
          note: link.note ?? null,
          created_at: now + i,
        })
        .execute();
      if (link.reply) {
        await tx
          .insertInto("comment")
          .values({
            id: crypto.randomUUID(),
            link_id: linkId,
            parent_id: null,
            author_id: id(link.reply.by),
            body: link.reply.body,
            created_at: now + i + 1,
          })
          .execute();
      }
    }
  });
}

console.log(`Seeded ${sqlite.name}. Sign in with any account:`);
for (const person of PEOPLE) console.log(`  ${person.username} / ${PASSWORD}`);
