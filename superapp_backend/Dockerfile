# ---------- deps: install ALL deps (dev included, needed for nest build) ----------
FROM node:20-bullseye AS deps
WORKDIR /app
# package.json has no "packageManager" field pinning a pnpm version, so bare
# `corepack enable` just installs shims that lazily download pnpm from
# registry.npmjs.org the first time something runs it — including inside the
# migrate initContainer at pod startup, an unnecessary runtime network
# dependency. Pin + bake it in at build time instead.
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- build: compile Nest using dev deps ----------
FROM node:20-bullseye AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig*.json nest-cli.json data-source.ts ./
COPY src ./src
RUN pnpm exec nest build && test -f dist/main.js

# ---------- prod-deps: prune to production deps ----------
FROM node:20-bullseye AS prod-deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm prune --prod

# ---------- migrator: full (dev) deps + source, only used by the initContainer to
# run `typeorm migration:run` — never serves traffic, so pruned prod deps (which
# drop typeorm's CLI, ts-node, tsconfig-paths) don't apply here. Built as its own
# target rather than an extra install step, since the deps stage already has
# everything this needs. ----------
FROM node:20-bullseye AS migrator
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig*.json data-source.ts ./
COPY src/migrations ./src/migrations
# The "typeorm" package.json script already bakes in "-d ./data-source.ts" —
# appending it again here breaks TypeORM's CLI arg parsing (same bug hit
# generating the migration locally: duplicate -d flags).
CMD ["pnpm", "typeorm", "migration:run"]

# ---------- runtime ----------
FROM node:20-bullseye AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
