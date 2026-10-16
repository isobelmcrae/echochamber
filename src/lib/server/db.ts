import Database from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import * as env from "$app/env/private";

// Add app tables here as they're created. Better Auth manages its own tables
// (user, session, account, verification) through this same instance.
export interface DB {}

const sqlite = new Database(env.DATABASE_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = new Kysely<DB>({
  dialect: new SqliteDialect({ database: sqlite }),
});
