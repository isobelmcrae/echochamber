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
bun run seed           # demo accounts alice, bob, sam, priya, jules, marco (password: echochamber) + shared rooms
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
- In tests, `DATABASE_PATH` is `:memory:` (from `.env.test`), so each test file gets a fresh SQLite database; `src/test-setup.ts` creates Better Auth's tables and runs our migrations. Vitest writes SvelteKit's generated files to its own `outDir` so it never hands a running dev server the test database. Use `createUser`/`addMember` from `src/lib/server/test-utils.ts`. Tests never touch the network: the setup stubs `unfurl`. Tests import modules that read `$app/env/private` and need `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` set (from `.env` locally, from the workflow env in CI). Without them they fail with `env_invalid`.

## Principles

Each principle names when it applies. Apply the ones that fit the task at hand.

**Core**

- **Laziness Protocol.** Refactoring, sizing a diff, or tempted to add abstractions, layers, or signal threading. Bias to deletion and the smallest change that solves the problem.
- **Foundational Thinking.** Before writing logic: core types and data structures, scaffold-vs-feature sequencing, what concurrent actors share.
- **Redesign from First Principles.** Integrating a new requirement into an existing design. Redesign as if it had been foundational from day one.
- **Attack the Premise.** Two or more fixes that share one premise have failed the same gate. Write the premise down and test it directly before you write another fix that assumes it.
- **Subtract Before You Add.** Sequencing an addition, refactor, or rewrite. Remove dead weight first, then build on the simpler base.
- **Minimize Reader Load.** Reviewing or shaping code that's hard to trace. Count layers and hidden state, collapse one-caller wrappers, shrink mutable scope.
- **Outcome-Oriented Execution.** Planned rewrites and migrations with explicit phase boundaries. Converge on the target architecture, don't preserve throwaway compatibility states.
- **Experience First.** Product, UX, or feature-scope tradeoffs. Choose user delight over implementation convenience.
- **Exhaust the Design Space.** A novel interaction or architectural decision with no precedent. Build 2-3 competing prototypes and compare before committing.
- **Build the Lever.** Any non-trivial work. Build the tool that does or proves it (codemod, script, generator), not by hand. The tool is the artifact a reviewer reruns.

**Architecture**

- **Model the Domain.** Writing stateful logic, or code that branches a lot or repeats a shape assumption across files. Encode the domain in a structure (state machine, typed model, table or registry, reducer, boundary, the right collection) instead of scattered conditionals.
- **Boundary Discipline.** Wiring validation, error handling, or framework adapters. Guards at system boundaries, trust internal types, keep business logic pure.
- **Type System Discipline.** Designing types or a signature. Make illegal states unrepresentable, brand primitives, parse external data at boundaries.
- **Make Operations Idempotent.** Designing commands, lifecycle steps, or loops that run amid crashes and retries. Converge to the same end state.
- **Migrate Callers Then Delete Legacy APIs.** Introducing a new internal API while old callers exist. Migrate and delete in one wave.
- **Separate Before Serializing Shared State.** Concurrent actors might write the same file, branch, key, or object. Eliminate the sharing first.

**Verification**

- **Prove It Works.** After a task, before declaring done. Verify against the real artifact, not a proxy or "it compiles".
- **Fix Root Causes.** Debugging. Trace each symptom back to the first place the system went wrong and fix it there. A guard is a fix only when the state it handles is legitimate.
- **Sequence Work into Verifiable Units.** Multi-step work (sweeps, migrations, runs of similar edits) and how you stack commits and PRs. Break work into small units that each end in a check, verify each before the next, and order delivery so the sequence proves itself.
- **Test Behavior, Not Implementation.** Writing, changing, or keeping a test. Assert what the code's users can observe, so the test fails when that behavior breaks and keeps passing when only the internals change.
- **Explain the Number.** Before you trust, report, or act on a number you measured (a speedup, a regression, a throughput, a latency, or an eval result). Find what limits it, and rule out that it measured something other than the work you think.

**Delegation**

- **Guard the Context Window.** Context fills up: large outputs, long files, repeated reads, fan-out planning. Route bulk to subagents, keep summaries in the main thread.
- **Never Block on the Human.** Tempted to ask "should I do X?" on reversible work. Proceed, present the result, let the human course-correct.

**Meta**

- **Encode Lessons in Structure.** You catch yourself writing the same instruction a second time. Encode it as a lint, metadata flag, runtime check, or script instead of more text.

## Architecture

SvelteKit 3 + Svelte 5 (runes forced on for all project files) with the experimental `async` compiler option and `remoteFunctions` enabled (`vite.config.ts`). Tailwind v4 is set up through the Vite plugin (`src/routes/layout.css`). Deploys to Node via `@sveltejs/adapter-node`.

- **Env vars** are declared in `src/env.ts` with `defineEnvVars` (descriptions, defaults, validation) and read server-side via `import * as env from "$app/env/private"`. To add a variable, declare it there and in `.env.example`.
- **Imports:** use the Node subpath alias `#lib/*` (from `package.json` `imports`) for `src/lib`, with explicit `.ts` extensions (e.g. `#lib/server/auth.ts`).
- **Database:** `src/lib/server/db.ts` exports a single Kysely instance over `better-sqlite3` (WAL, foreign keys on). App tables are typed in its `DB` interface — add each new table there, with a migration in `src/lib/server/migrations/` registered in `migrate.ts` (run on startup by the `init` hook). Never edit a migration that has shipped. Inside `db.transaction()`, query only through `tx`: SQLite has one connection, so touching `db` there deadlocks. Better Auth uses the same instance and owns its own tables (`user`, `session`, `account`, `verification`). The `init` hook creates/updates them (`migrateAuth()` in `auth.ts`) before our migrations; `bun run auth:migrate` does the same by hand. Never change them by hand.
- **Auth:** `src/lib/server/auth.ts` configures Better Auth (email + password). The `sveltekitCookies` plugin must stay **last** in `plugins`. `src/hooks.server.ts` resolves the session on each request, puts it on `event.locals.session` / `event.locals.user` (types are inferred from `auth` in `src/app.d.ts`), and hands the request to `svelteKitHandler`, which serves `/api/auth/*`. Client code uses `authClient` from `src/lib/auth-client.ts`.
- **Domain:** `src/lib/server/{rooms,invites,links,comments}.ts` hold the business rules and take the acting user's id. Room permissions live in the table in `permissions.ts` (`requireMember(roomId, userId, action?)`: 404 for non-members, 403 without permission). Domain functions throw SvelteKit `error()`s and publish change events after every write.
- **Remote functions** in `src/lib/remote/*.remote.ts` are thin: `requireUser()`, valibot input, call the domain. Remote files may only export remote functions; shared schemas go in `src/lib/schemas.ts`.
- **Live updates:** each tab holds exactly one live stream, `changes` (`src/lib/remote/changes.remote.ts`), which sends a token whenever `events.ts` publishes on a topic the user can see (`user:<id>`, or `room:<id>` for their rooms). Reads are plain `query`s; a component that reads one calls `refreshOnChange(() => [query(args), …])` (`src/lib/refresh-on-change.svelte.ts`) before its first `await`. Don't add another `query.live`: SvelteKit only releases one when it's garbage collected, so each holds an HTTP connection long after its page is gone, and browsers allow six per host over HTTP/1.1 (`src/lib/remote/live.test.ts` enforces this). The bus is in-process, so this assumes one Node process. Forms submit with `form.submit().updates()` since reads refresh on `changes`.
- **Link previews:** `unfurl.ts` fetches OpenGraph/oEmbed metadata with SSRF guards (public addresses only, checked in the socket's DNS lookup on every redirect hop); `previews.ts` runs it in the background after a link is posted and notifies the rooms that shared it.
- Anything under `src/lib/server/` is server-only. Never import it from client code.

## Zenith

Use the checked-in .agents/skills/zenith-setup/SKILL.md to prepare this repository for Zenith. Read the Compose, test, and publish skills there as the work progresses. Run `zenith check` after adapting Dockerfile and zenith-compose.yml to the actual app. Keep secrets out of Git.

You do not need Docker installed locally; Zenith builds and runs containers on the platform, so use `zenith up` for previews. Zenith also provides outbound app email through its SMTP relay. Configure x-zenith.env using the Compose skill for previews and published apps.

- The `Dockerfile` builds with Bun on Node 24 (better-sqlite3 v13 compiles from source, so the build stages carry python3/make/g++) and runs `node build` on port 3000. The SQLite file lives on the `data` volume at `/data/echochamber.db`.
- `x-zenith.env` generates `BETTER_AUTH_SECRET` and aliases `BETTER_AUTH_URL` to `ZENITH_PUBLIC_URL`. The app sends no email, so no SMTP mapping.
- adapter-node (SvelteKit 3) has no `ORIGIN` env var: it derives the request origin from the `Host` header and defaults the protocol to `https`. Better Auth only serves `/api/auth/*` when that origin matches `BETTER_AUTH_URL`, so a production build served over plain http 404s on auth. That's fine behind Zenith's HTTPS proxy; to test the image locally, set `BETTER_AUTH_URL=https://localhost:3000`.
