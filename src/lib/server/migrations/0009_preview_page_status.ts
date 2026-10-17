import { sql, type Kysely } from "kysely";

// `frameable` (1/0/null) becomes `page_status`, which can also say the page
// doesn't resolve. Every preview is fetched again on startup to find the
// broken ones; a refetch that fails keeps the preview it had (see previews.ts).
export async function up(db: Kysely<any>) {
  await db.schema.alterTable("link_preview").addColumn("page_status", "text").execute();
  await db
    .updateTable("link_preview")
    .set({
      page_status: sql`case frameable when 1 then 'frameable' when 0 then 'unframeable' end`,
      status: "pending",
    })
    .execute();
  await db.schema.alterTable("link_preview").dropColumn("frameable").execute();
}
