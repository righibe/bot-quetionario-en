# ===========================================================================
# English Streak — production Dockerfile (multi-stage)
# ===========================================================================

# --------------------------------------------------------------------------
# Stage 1: build (install all deps, generate Prisma client, compile TS)
# --------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Prisma engines need these on Alpine.
RUN apk add --no-cache openssl libc6-compat

# Activate the yarn version pinned in package.json (packageManager field).
RUN corepack enable

# Install dependencies (cached unless manifest/lockfile change).
# yarn.lock* is optional: it is used when present, generated otherwise.
COPY package.json yarn.lock* .yarnrc.yml ./
RUN yarn install

# Generate the Prisma client.
COPY prisma ./prisma
RUN yarn prisma generate

# Compile TypeScript and copy static data into dist/.
COPY tsconfig.json ./
COPY scripts ./scripts
COPY src ./src
RUN yarn build

# --------------------------------------------------------------------------
# Stage 2: runtime (production-only deps + compiled output)
# --------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl libc6-compat

RUN corepack enable

# Production dependencies only (workspace-tools provides `workspaces focus`).
COPY package.json yarn.lock* .yarnrc.yml ./
RUN yarn plugin import workspace-tools \
    && yarn workspaces focus --production \
    && yarn cache clean

# Prisma schema + generated client.
COPY prisma ./prisma
RUN yarn prisma generate

# Compiled application (includes dist/data/questions.json via copy-data).
COPY --from=builder /app/dist ./dist

# Entrypoint: apply DB schema, then start the bot.
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Run as the unprivileged built-in "node" user.
USER node

CMD ["./docker-entrypoint.sh"]
