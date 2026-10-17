import { type Kysely, sql } from "kysely";

// Full-text search over links: one row per link holding everything a search can match
// it by. The trigram tokenizer matches any 3+ character substring, ignoring case and
// accents. Triggers keep it in step with every table it draws from, inside the same
// transaction as the write, so nothing in the app has to remember to update it.
//
// Rows are keyed by the UNINDEXED link_id, so replacing one scans the index's content
// table. That's fine at this size; key by an integer rowid if it ever shows up.

/** Index the links (aliased `l`) matching `where`. */
function index(where: string) {
  return `
    INSERT INTO link_fts (link_id, author, title, note, url, comments, commenters)
    SELECT
      l.id,
      coalesce((SELECT concat_ws(' ', u.username, u.name) FROM "user" u WHERE u.id = l.author_id), ''),
      coalesce((SELECT concat_ws(' ', p.title, p.site_name, p.description) FROM link_preview p WHERE p.url = l.url), ''),
      coalesce(l.note, ''),
      l.url,
      coalesce((SELECT group_concat(c.body, ' ') FROM comment c WHERE c.link_id = l.id AND c.deleted_at IS NULL), ''),
      coalesce((
        SELECT group_concat(DISTINCT concat_ws(' ', u.username, u.name))
        FROM comment c JOIN "user" u ON u.id = c.author_id
        WHERE c.link_id = l.id AND c.deleted_at IS NULL
      ), '')
    FROM link l WHERE ${where};`;
}

/** Rebuild the rows of the links (aliased `l`) matching `where`. */
function reindex(where: string) {
  return `
    DELETE FROM link_fts WHERE link_id IN (SELECT l.id FROM link l WHERE ${where});
    ${index(where)}`;
}

const TRIGGERS = {
  link_fts_link_insert: `AFTER INSERT ON link BEGIN ${reindex("l.id = NEW.id")} END`,
  // Also fires when the author's account is deleted (author_id is set null).
  link_fts_link_update: `AFTER UPDATE ON link BEGIN ${reindex("l.id = NEW.id")} END`,
  link_fts_link_delete: `AFTER DELETE ON link BEGIN DELETE FROM link_fts WHERE link_id = OLD.id; END`,
  link_fts_comment_insert: `AFTER INSERT ON comment BEGIN ${reindex("l.id = NEW.link_id")} END`,
  link_fts_comment_update: `AFTER UPDATE ON comment BEGIN ${reindex("l.id = NEW.link_id")} END`,
  link_fts_comment_delete: `AFTER DELETE ON comment BEGIN ${reindex("l.id = OLD.link_id")} END`,
  link_fts_preview_insert: `AFTER INSERT ON link_preview BEGIN ${reindex("l.url = NEW.url")} END`,
  link_fts_preview_update: `AFTER UPDATE ON link_preview BEGIN ${reindex("l.url = NEW.url")} END`,
  // Better Auth owns `user`; its migrations only add columns, which keeps triggers.
  link_fts_user_update: `AFTER UPDATE OF name, username ON "user" BEGIN ${reindex(
    "l.author_id = NEW.id OR l.id IN (SELECT link_id FROM comment WHERE author_id = NEW.id)",
  )} END`,
};

export async function up(db: Kysely<any>) {
  await sql`
    CREATE VIRTUAL TABLE link_fts USING fts5(
      link_id UNINDEXED, author, title, note, url, comments, commenters,
      tokenize = 'trigram remove_diacritics 1'
    )`.execute(db);
  for (const [name, body] of Object.entries(TRIGGERS)) {
    await sql.raw(`CREATE TRIGGER ${name} ${body}`).execute(db);
  }
  await sql.raw(index("1")).execute(db);
}
