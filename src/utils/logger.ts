import { env } from '../config';

/**
 * Minimal, dependency-free structured logger.
 * Levels are filtered by LOG_LEVEL. Output is single-line and timestamped so it
 * plays nicely with `docker logs` and journald on the VPS.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const threshold = LEVEL_WEIGHT[env.app.logLevel] ?? LEVEL_WEIGHT.info;

function emit(level: Level, scope: string, message: string, meta?: unknown): void {
  if (LEVEL_WEIGHT[level] < threshold) return;

  const timestamp = new Date().toISOString();
  const base = `${timestamp} ${level.toUpperCase().padEnd(5)} [${scope}] ${message}`;

  const write = level === 'error' || level === 'warn' ? console.error : console.log;

  if (meta !== undefined) {
    write(base, meta instanceof Error ? meta.stack ?? meta.message : meta);
  } else {
    write(base);
  }
}

export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

/** Creates a scoped logger, e.g. `createLogger('DailyService')`. */
export function createLogger(scope: string): Logger {
  return {
    debug: (message, meta) => emit('debug', scope, message, meta),
    info: (message, meta) => emit('info', scope, message, meta),
    warn: (message, meta) => emit('warn', scope, message, meta),
    error: (message, meta) => emit('error', scope, message, meta),
  };
}

/** Default application-wide logger. */
export const logger = createLogger('App');
