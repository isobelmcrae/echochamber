import type { Kysely } from "kysely";
import { Migrator } from "kysely/migration";
import * as rooms from "./migrations/0001_rooms.ts";
import * as invites from "./migrations/0002_invites.ts";
import * as links from "./migrations/0003_links.ts";
import * as comments from "./migrations/0004_comments.ts";
import * as inviteRole from "./migrations/0005_invite_role.ts";
import * as lastRead from "./migrations/0006_last_read.ts";
import * as previewFrameable from "./migrations/0007_preview_frameable.ts";
import * as linkSeen from "./migrations/0008_link_seen.ts";
import * as previewPageStatus from "./migrations/0009_preview_page_status.ts";
import * as roomInk from "./migrations/0010_room_ink.ts";
import * as linkSearch from "./migrations/0011_link_search.ts";

// Ordered by key. Never edit a migration that has shipped; add a new one.
const migrations = {
  "0001_rooms": rooms,
  "0002_invites": invites,
  "0003_links": links,
  "0004_comments": comments,
  "0005_invite_role": inviteRole,
  "0006_last_read": lastRead,
  "0007_preview_frameable": previewFrameable,
  "0008_link_seen": linkSeen,
  "0009_preview_page_status": previewPageStatus,
  "0010_room_ink": roomInk,
  "0011_link_search": linkSearch,
};

// Takes the database rather than importing db.ts so scripts can run it too.
export async function migrate(db: Kysely<any>) {
  const migrator = new Migrator({ db, provider: { getMigrations: async () => migrations } });
  const { error } = await migrator.migrateToLatest();
  if (error) throw error;
}
