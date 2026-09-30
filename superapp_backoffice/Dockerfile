# ---------- deps ----------
FROM node:20-bullseye AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM node:20-bullseye AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, not
# read at runtime — must be real by the time `next build` runs, same lesson
# learned on fintech-portal-api's Wayfinder/APP_URL build-time requirement.
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_SOCKET_URL=""
ARG NEXT_PUBLIC_ENVIRONMENT="PROD"
ARG NEXT_PUBLIC_NEXUS_URL=""
ARG NEXT_PUBLIC_NEXUS_PUB_GROUP_URL=""
ARG NEXT_PUBLIC_MINIO_URL=""
ARG NEXT_PUBLIC_JENKINS_URL=""
ARG NEXT_PUBLIC_SUPERAPP_GIT_REPO_URL=""
ARG NEXT_PUBLIC_SUPERAPP_SANDBOX_URL=""
ARG NEXT_PUBLIC_PREVIEW_ENABLED="true"
ARG NEXT_PUBLIC_PREVIEW_ALLOW_LOCALHOST="false"
ARG NEXT_PUBLIC_PREVIEW_REQUIRE_HTTPS="true"
ARG NEXT_PUBLIC_PREVIEW_SESSION_TIMEOUT="3600"
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL} \
    NEXT_PUBLIC_ENVIRONMENT=${NEXT_PUBLIC_ENVIRONMENT} \
    NEXT_PUBLIC_NEXUS_URL=${NEXT_PUBLIC_NEXUS_URL} \
    NEXT_PUBLIC_NEXUS_PUB_GROUP_URL=${NEXT_PUBLIC_NEXUS_PUB_GROUP_URL} \
    NEXT_PUBLIC_MINIO_URL=${NEXT_PUBLIC_MINIO_URL} \
    NEXT_PUBLIC_JENKINS_URL=${NEXT_PUBLIC_JENKINS_URL} \
    NEXT_PUBLIC_SUPERAPP_GIT_REPO_URL=${NEXT_PUBLIC_SUPERAPP_GIT_REPO_URL} \
    NEXT_PUBLIC_SUPERAPP_SANDBOX_URL=${NEXT_PUBLIC_SUPERAPP_SANDBOX_URL} \
    NEXT_PUBLIC_PREVIEW_ENABLED=${NEXT_PUBLIC_PREVIEW_ENABLED} \
    NEXT_PUBLIC_PREVIEW_ALLOW_LOCALHOST=${NEXT_PUBLIC_PREVIEW_ALLOW_LOCALHOST} \
    NEXT_PUBLIC_PREVIEW_REQUIRE_HTTPS=${NEXT_PUBLIC_PREVIEW_REQUIRE_HTTPS} \
    NEXT_PUBLIC_PREVIEW_SESSION_TIMEOUT=${NEXT_PUBLIC_PREVIEW_SESSION_TIMEOUT}
RUN pnpm exec next build

# ---------- runtime ----------
FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3002
ENV PORT=3002 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
