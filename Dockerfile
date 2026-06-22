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

# Install dependencies (cached unless lockfile changes).
COPY package*.json ./
RUN npm ci

# Generate the Prisma client.
COPY prisma ./prisma
RUN npx prisma generate

# Compile TypeScript and copy static data into dist/.
COPY tsconfig.json ./
COPY scripts ./scripts
COPY src ./src
RUN npm run build

# --------------------------------------------------------------------------
# Stage 2: runtime (production-only deps + compiled output)
# --------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl libc6-compat

# Production dependencies only.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Prisma schema + generated client.
COPY prisma ./prisma
RUN npx prisma generate

# Compiled application (includes dist/data/questions.json via copy-data).
COPY --from=builder /app/dist ./dist

# Entrypoint: apply DB schema, then start the bot.
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Run as the unprivileged built-in "node" user.
USER node

CMD ["./docker-entrypoint.sh"]
