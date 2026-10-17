import Database from "better-sqlite3";
import { type Generated, Kysely, ParseJSONResultsPlugin, SqliteDialect } from "kysely";
import * as env from "$app/env/private";
import type { PageStatus } from "#lib/embed.ts";
import type { Role } from "./permissions.ts";

// Timestamps are integer epoch milliseconds; ids are random UUIDs.
// Inside db.transaction(), query only through `tx`: SQLite has one connection,
// so awaiting a query on `db` there waits on the transaction forever.

// Better Auth owns this table (change it with `bun run auth:migrate`). Only the
// columns the app reads are typed here.
interface UserTable {
  id: string;
  name: string;
  username: string | null;
  displayUsername: string | null;
  image: string | null;
}

interface RoomTable {
  id: string;
  title: string | null;
  /** The ink pair every member sees the room printed in, as lowercase `#rrggbb`. */
  ink_a: string;
  ink_b: string;
  /** Set on a user's personal room (one each, made by a trigger): only they're ever in it. */
  personal_of: string | null;
  created_by: string | null;
  created_at: number;
  updated_at: number;
}

interface RoomMemberTable {
  room_id: string;
  user_id: string;
  role: Role;
  joined_at: number;
  last_read_at: Generated<number>;
}

interface RoomInviteTable {
  room_id: string;
  invitee_id: string;
  inviter_id: string | null;
  role: Generated<Role>;
  created_at: number;
}

interface InviteTokenTable {
  id: string;
  room_id: string;
  token: string;
  created_by: string | null;
  expires_at: number | null;
  max_uses: number | null;
  use_count: Generated<number>;
  revoked_at: number | null;
  created_at: number;
}

interface LinkPreviewTable {
  url: string;
  status: "pending" | "ok" | "failed";
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
  /** Whether the page lets other sites frame it, or doesn't resolve; null when unknown. */
  page_status: PageStatus | null;
  fetched_at: number | null;
}

interface LinkTable {
  id: string;
  room_id: string;
  author_id: string | null;
  /** Normalized; also the link_preview key. */
  url: string;
  note: string | null;
  created_at: number;
  edited_at: number | null;
}

interface LinkSeenTable {
  user_id: string;
  link_id: string;
  seen_at: number;
}

interface CommentTable {
  id: string;
  link_id: string;
  parent_id: string | null;
  author_id: string | null;
  body: string;
  created_at: number;
  edited_at: number | null;
  deleted_at: number | null;
}

/** FTS5 index over links, kept in step by triggers (migration 0011). Read-only here. */
interface LinkFtsTable {
  link_id: string;
  author: string;
  title: string;
  note: string;
  url: string;
  comments: string;
  commenters: string;
}

export interface DB {
  user: UserTable;
  room: RoomTable;
  room_member: RoomMemberTable;
  room_invite: RoomInviteTable;
  invite_token: InviteTokenTable;
  link_preview: LinkPreviewTable;
  link: LinkTable;
  link_seen: LinkSeenTable;
  comment: CommentTable;
  link_fts: LinkFtsTable;
}

const JSON_COLUMN = /^\$\[\d+\]\."(members|author|preview|ink)"$/;

const sqlite = new Database(env.DATABASE_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = new Kysely<DB>({
  dialect: new SqliteDialect({ database: sqlite }),
  plugins: [
    // SQLite returns jsonArrayFrom/jsonObjectFrom subqueries as text. Parse only
    // those columns (by alias) so user text that looks like JSON stays a string.
    new ParseJSONResultsPlugin({ shouldParse: (_, path) => JSON_COLUMN.test(path) }),
  ],
});
