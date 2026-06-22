#!/bin/sh
# ===========================================================================
# Container entrypoint.
# Applies the database schema, then launches the bot.
#   - If versioned migrations exist (prisma/migrations), they are applied with
#     `prisma migrate deploy` (recommended for production).
#   - Otherwise the schema is synced directly with `prisma db push` so a fresh
#     install works out of the box.
# ===========================================================================
set -e

echo "[entrypoint] Preparing database schema..."

if [ -d "prisma/migrations" ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "[entrypoint] Applying migrations (prisma migrate deploy)..."
  npx prisma migrate deploy
else
  echo "[entrypoint] No migrations found. Syncing schema (prisma db push)..."
  npx prisma db push --skip-generate
fi

echo "[entrypoint] Starting English Streak bot..."
exec node dist/index.js
