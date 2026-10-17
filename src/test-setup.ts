import { beforeEach, vi } from "vitest";
import { migrateAuth } from "#lib/server/auth.ts";
import { db } from "#lib/server/db.ts";
import { migrate } from "#lib/server/migrate.ts";
import * as unfurl from "#lib/server/unfurl.ts";

// Each test file gets a fresh :memory: database: create Better Auth's tables,
// then ours (which reference `user`).
await migrateAuth();
await migrate(db);

// Posting a link fetches its preview in the background; tests never touch the
// network. Tests that care stub `unfurl` themselves.
beforeEach(() => {
  vi.spyOn(unfurl, "unfurl").mockResolvedValue({ preview: null, page: null });
});
