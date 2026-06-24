/**
 * One-time backfill for per-server scores (guild_scores).
 *
 * The per-server leaderboard only started recording points when the feature
 * went live, so players who scored *before* that don't appear in a server's
 * Top 5 until they play again. This script seeds each user's server score from
 * their current GLOBAL totals.
 *
 * It SETS (not increments) the values to the user's current global totals, so:
 *   - it is safe to run multiple times (idempotent — no double counting);
 *   - future daily completions keep incrementing on top correctly.
 *
 * Caveat: it attributes every user's points to the SINGLE guild you pass in.
 * That's correct for a bot running in one server (one CHANNEL_RANKING). Pass the
 * guild id of the RANKING channel's server (the ranking reads by channel.guildId,
 * which is not necessarily DISCORD_GUILD_ID). If the bot truly spans multiple
 * servers, only run it for the main one.
 *
 * This file lives under src/ (not scripts/) on purpose: it is compiled into
 * dist/ by the production build, so it can run inside the container with plain
 * node — no ts-node needed.
 *
 * Usage:
 *   # production container (compiled):
 *   node dist/scripts/backfill-guild-scores.js <guildId>
 *   # local dev (ts-node):
 *   yarn db:backfill-guild-scores <guildId>
 *   # or, falling back to DISCORD_GUILD_ID from the environment:
 *   node dist/scripts/backfill-guild-scores.js
 */
import { prisma } from '../database';
import { env } from '../config';
import { logger } from '../utils/logger';

async function main(): Promise<void> {
  const guildId = process.argv[2]?.trim() || env.discord.guildId;

  if (!guildId) {
    throw new Error(
      'No guild id. Pass it as an argument ' +
        '(node dist/scripts/backfill-guild-scores.js <guildId>) ' +
        'or set DISCORD_GUILD_ID in the environment.',
    );
  }

  const users = await prisma.user.findMany({
    where: { points: { gt: 0 } },
    select: {
      id: true,
      username: true,
      points: true,
      totalCorrectAnswers: true,
      totalQuestionsAnswered: true,
    },
  });

  logger.info(`Backfilling ${users.length} user(s) into guild ${guildId}...`);

  for (const user of users) {
    await prisma.guildScore.upsert({
      where: { guildId_userId: { guildId, userId: user.id } },
      create: {
        guildId,
        userId: user.id,
        username: user.username,
        points: user.points,
        totalCorrectAnswers: user.totalCorrectAnswers,
        totalQuestionsAnswered: user.totalQuestionsAnswered,
      },
      update: {
        username: user.username,
        points: user.points,
        totalCorrectAnswers: user.totalCorrectAnswers,
        totalQuestionsAnswered: user.totalQuestionsAnswered,
      },
    });
  }

  logger.info(`Done. Seeded ${users.length} server score(s) for guild ${guildId}.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error('Backfill failed.', err);
    await prisma.$disconnect();
    process.exit(1);
  });
