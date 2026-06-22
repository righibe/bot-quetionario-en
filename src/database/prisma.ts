import { PrismaClient } from '@prisma/client';
import { env } from '../config';
import { createLogger } from '../utils/logger';

const log = createLogger('Prisma');

/**
 * Single, shared PrismaClient instance.
 * In development with hot-reload we cache it on `globalThis` to avoid exhausting
 * the database connection pool when the process is repeatedly re-evaluated.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: env.database.url } },
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
    ],
  });

prisma.$on('warn' as never, (e: unknown) => log.warn('Prisma warning', e));
prisma.$on('error' as never, (e: unknown) => log.error('Prisma error', e));

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}

/** Verifies database connectivity; throws on failure. */
export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  log.info('Database connection established.');
}

/** Gracefully closes the database connection. */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  log.info('Database connection closed.');
}
