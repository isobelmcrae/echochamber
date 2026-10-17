import type { Kysely } from "kysely";

// Each room's ink pair as hex values (`ink_a` light, `ink_b` dark; see #lib/ink.ts),
// shared by all its members instead of worked out per viewer. Existing rooms go round
// the palette in the order they were made. The pairs are copied here so later palette
// changes can't alter this.
const INKS = [
  ["#ff48b0", "#0078bf"],
  ["#ffb511", "#00838a"],
  ["#00a95c", "#3d5588"],
  ["#ffe800", "#914e72"],
  ["#ff6c2f", "#3255a4"],
  ["#ff665e", "#00838a"],
] as const;

export async function up(db: Kysely<any>) {
  const [a, b] = INKS[0];
  await db.schema
    .alterTable("room")
    .addColumn("ink_a", "text", (c) => c.notNull().defaultTo(a))
    .execute();
  await db.schema
    .alterTable("room")
    .addColumn("ink_b", "text", (c) => c.notNull().defaultTo(b))
    .execute();
  const rooms = await db
    .selectFrom("room")
    .select("id")
    .orderBy("created_at")
    .orderBy("id")
    .execute();
  for (const [i, room] of rooms.entries()) {
    const [ink_a, ink_b] = INKS[i % INKS.length]!;
    await db.updateTable("room").set({ ink_a, ink_b }).where("id", "=", room.id).execute();
  }
}
