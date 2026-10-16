# Build with Bun (the project's package manager), run on Node: adapter-node's
# output and better-sqlite3's native binding both target Node.
FROM node:24-slim AS base
COPY --from=oven/bun:1.4.3 /usr/local/bin/bun /usr/local/bin/bun
# better-sqlite3 compiles its native binding on install.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
# The build validates env vars; the real values are read at runtime.
RUN BETTER_AUTH_SECRET=build-placeholder-not-a-secret-000000 BETTER_AUTH_URL=http://localhost \
    bun run build

# Runtime needs only `dependencies`; adapter-node bundles the rest into build/.
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 DATABASE_PATH=/data/echochamber.db
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node", "build"]
