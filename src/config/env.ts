import 'dotenv/config';

/**
 * Centralized, validated access to environment variables.
 * Fails fast (throws) at startup if a required variable is missing, so the bot
 * never boots into a half-configured state.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `[config] Missing required environment variable: ${name}. ` +
        `Check your .env file (see .env.example).`,
    );
  }
  return value.trim();
}

function optional(name: string, fallback = ''): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

/**
 * Resolves the database connection string.
 *  - If DATABASE_URL is provided (e.g. by docker-compose), it takes priority.
 *  - Otherwise it is assembled from the POSTGRES_* variables, so a local setup
 *    only needs user/password/db.
 */
function buildDatabaseUrl(): string {
  const direct = optional('DATABASE_URL');
  if (direct) return direct;

  const user = required('POSTGRES_USER');
  const password = required('POSTGRES_PASSWORD');
  const db = required('POSTGRES_DB');
  const host = optional('POSTGRES_HOST', 'localhost');
  const port = optional('POSTGRES_PORT', '5432');

  return `postgresql://${user}:${password}@${host}:${port}/${db}?schema=public`;
}

export const env = {
  discord: {
    token: required('DISCORD_TOKEN'),
    /**
     * Optional guild id. When set, slash commands are registered to this single
     * server only. When unset, they are registered to every server the bot is
     * in. Either way commands are guild-scoped (instant) and never global.
     */
    guildId: optional('DISCORD_GUILD_ID'),
  },
  channels: {
    dailyQuestions: optional('CHANNEL_DAILY_QUESTIONS'),
    ranking: optional('CHANNEL_RANKING'),
  },
  /**
   * Private events API. The bot NEVER writes scores to the DB directly anymore;
   * it reports validated events to this closed-source API, which is the single
   * source of truth for points. Both must be set for reporting to be enabled.
   */
  events: {
    apiUrl: optional('EVENTS_API_URL'),
    apiKey: optional('EVENTS_API_KEY'),
    timeoutMs: Number(optional('EVENTS_API_TIMEOUT_MS', '4000')),
    get enabled(): boolean {
      return this.apiUrl !== '' && this.apiKey !== '';
    },
  },
  database: {
    url: buildDatabaseUrl(),
  },
  app: {
    // NODE_ENV is optional (defaults to production; the Docker image sets it).
    nodeEnv: optional('NODE_ENV', 'production'),
    timezone: optional('TZ', 'America/Sao_Paulo'),
    dailyCron: optional('DAILY_CRON', '0 0 * * *'),
    logLevel: optional('LOG_LEVEL', 'info') as LogLevel,
  },
  get isProduction(): boolean {
    return this.app.nodeEnv === 'production';
  },
} as const;

// Make the resolved URL available to the Prisma Client (which reads
// process.env.DATABASE_URL) even when it was assembled from POSTGRES_* parts.
process.env.DATABASE_URL = env.database.url;
