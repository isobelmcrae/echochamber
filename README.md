# echochamber

![echochamber: Watch later, but for real.](static/banner.png)

Private rooms for sharing links with friends. Invite people to a room, post
links (with automatic previews), and talk about them in comments, all updating
live. Built with SvelteKit, Svelte 5, Better Auth, and SQLite.

## Local development

Requires [Bun](https://bun.sh) and Node 24 (better-sqlite3 builds a native
binding on install, so you also need python3, make, and a C++ compiler).

```sh
bun install --frozen-lockfile
cp .env.example .env
# set BETTER_AUTH_SECRET in .env, e.g. to the output of: openssl rand -base64 32
bun run seed   # optional: demo users alice, bob, sam, priya, jules, marco (password: echochamber)
bun run dev    # http://localhost:5173
```

The database (`local.db` by default) is created and migrated when the dev
server starts.

Before committing, run the same checks as CI:

```sh
bun run check && bun run lint && bun run format:check && bun run test:run
```
