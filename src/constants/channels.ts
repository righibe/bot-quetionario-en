import { env } from '../config';

/**
 * Channel IDs used by the bot.
 *
 * You can either hard-code them here (replace the placeholder IDs below) or
 * provide them via the environment (CHANNEL_DAILY_QUESTIONS / CHANNEL_RANKING),
 * which takes precedence. Replace the placeholders with your real IDs.
 */
export const CHANNELS = {
  dailyQuestions: env.channels.dailyQuestions || '000000000000000000',
  ranking: env.channels.ranking || '000000000000000000',
} as const;
