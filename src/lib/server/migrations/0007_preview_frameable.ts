import type { Kysely } from "kysely";

// Whether the page lets other sites frame it (1/0), or null when unknown. Every
// existing preview is fetched again on startup to find out; a refetch that
// fails keeps the preview it had (see previews.ts).
export async function up(db: Kysely<any>) {
  await db.schema.alterTable("link_preview").addColumn("frameable", "integer").execute();
  await db.updateTable("link_preview").set({ status: "pending" }).execute();
}
