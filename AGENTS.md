# AGENTS.md

Guidance for coding agents working in this repository.

## Commands

Bun is the package manager and script runner (`bun install --frozen-lockfile`).

```sh
bun run dev            # vite dev server (http://localhost:5173)
bun run build          # production build (adapter-node → build/)
bun run check          # svelte-kit sync + svelte-check (types)
bun run lint           # oxlint   (lint:fix to autofix)
bun run format:check   # oxfmt    (format to rewrite)
bun run test           # vitest, watch mode
bun run test:run       # vitest, single run
bun run test:run src/lib/server/db.test.ts   # one file
bun run test:run -t "runs a query"           # one test by name
bun run auth:migrate   # create/update Better Auth tables in DATABASE_PATH
```

## Gates — every change

Every change must leave all of these passing before it counts as done. CI
(`.github/workflows/ci.yml`) runs the same four on every push and PR:

```sh
bun run check && bun run lint && bun run format:check && bun run test:run
```

Do not silence a gate (disabling rules, `// @ts-ignore`, skipping tests) to get a green run. If you must, add a comment saying why.

## TDD with vitest

- Red → green → refactor. Write the failing test first, see it fail, then write the minimum code that passes it.
- **Bugs:** a bug fix needs a regression test that fails without the fix and passes with it. Fixes without a test are not done.
- Tests live next to the code as `src/**/*.{test,spec}.{js,ts}` and run in the `node` environment (see `vite.config.ts`).
- In tests, `DATABASE_PATH` is `:memory:`, so each test run gets a fresh, empty SQLite database. Tests import modules that read `$app/env/private` and need `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` set (from `.env` locally, from the workflow env in CI). Without them they fail with `env_invalid`.

## Working style (ponytail)

Be a lazy senior developer: lazy means efficient, not careless. The best code is the code you never write.

Before writing code, stop at the first rung that holds:

1. Does this need to be built at all? (YAGNI)
2. Does the standard library do this? Use it.
3. Does a native platform feature cover it? Use it.
4. Does an already-installed dependency solve it? Use it.
5. Can this be one line? Make it one line.
6. Only then: write the minimum code that works.

Rules:

- No abstractions nobody asked for. No avoidable dependencies. No unrequested boilerplate. Prefer deleting to adding, boring to clever, and as few files as possible.
- Ship the lazy version, and if a request seems too complex, question it in the same response. Never stall.
- When two stdlib options are the same size, pick the one that handles edge cases correctly.
- Mark intentional simplifications with a `ponytail:` comment. If a shortcut has a known ceiling, name the ceiling and the upgrade path.
- Never simplify away: input validation at trust boundaries, error handling that prevents data loss, security measures, accessibility basics, anything the user explicitly asked to keep.
- Reports: code first, then at most three short lines on what was skipped and when to add it.

## Architecture

SvelteKit 3 + Svelte 5 (runes forced on for all project files) with the experimental `async` compiler option and `remoteFunctions` enabled (`vite.config.ts`). Tailwind v4 is set up through the Vite plugin (`src/routes/layout.css`). Deploys to Node via `@sveltejs/adapter-node`.

- **Env vars** are declared in `src/env.ts` with `defineEnvVars` (descriptions, defaults, validation) and read server-side via `import * as env from "$app/env/private"`. To add a variable, declare it there and in `.env.example`.
- **Imports:** use the Node subpath alias `#lib/*` (from `package.json` `imports`) for `src/lib`, with explicit `.ts` extensions (e.g. `#lib/server/auth.ts`).
- **Database:** `src/lib/server/db.ts` exports a single Kysely instance over `better-sqlite3` (WAL, foreign keys on). App tables are typed in its `DB` interface — add each new table there. Better Auth uses the same instance and owns its own tables (`user`, `session`, `account`, `verification`). Change those with `bun run auth:migrate`, never by hand.
- **Auth:** `src/lib/server/auth.ts` configures Better Auth (email + password). The `sveltekitCookies` plugin must stay **last** in `plugins`. `src/hooks.server.ts` resolves the session on each request, puts it on `event.locals.session` / `event.locals.user` (types are inferred from `auth` in `src/app.d.ts`), and hands the request to `svelteKitHandler`, which serves `/api/auth/*`. Client code uses `authClient` from `src/lib/auth-client.ts`.
- Anything under `src/lib/server/` is server-only. Never import it from client code.
