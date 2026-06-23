import { GuildScore, Prisma, User } from '@prisma/client';
import { prisma } from '../database';

/** A guild score row joined with its owning user (for streak/global stats). */
export type GuildScoreWithUser = GuildScore & { user: User };

/** Increment payload applied to a (guild, user) score on a completed daily. */
export interface GuildScoreDelta {
  points: number;
  correct: number;
  answered: number;
}

/**
 * Data-access layer for the per-server score (GuildScore). Only persistence
 * concerns; the attribution rules live in the services.
 */
export class GuildScoreRepository {
  /**
   * Adds the given deltas to a user's score in a guild, creating the row on the
   * first contribution. Also keeps the denormalized username fresh.
   */
  increment(
    guildId: string,
    userId: string,
    username: string,
    delta: GuildScoreDelta,
  ): Promise<GuildScore> {
    return prisma.guildScore.upsert({
      where: { guildId_userId: { guildId, userId } },
      create: {
        guildId,
        userId,
        username,
        points: delta.points,
        totalCorrectAnswers: delta.correct,
        totalQuestionsAnswered: delta.answered,
      },
      update: {
        username,
        points: { increment: delta.points },
        totalCorrectAnswers: { increment: delta.correct },
        totalQuestionsAnswered: { increment: delta.answered },
      },
    });
  }

  /** Top scorers in a guild (with their user, for global streak display). */
  findTop(guildId: string, limit: number): Promise<GuildScoreWithUser[]> {
    return prisma.guildScore.findMany({
      where: { guildId },
      orderBy: [{ points: 'desc' }, { updatedAt: 'asc' }],
      take: limit,
      include: { user: true },
    });
  }

  /** A single user's score in a guild, if they have one. */
  findOne(guildId: string, userId: string): Promise<GuildScore | null> {
    return prisma.guildScore.findUnique({
      where: { guildId_userId: { guildId, userId } },
    });
  }

  /** Number of scored players in a guild. */
  count(guildId: string): Promise<number> {
    return prisma.guildScore.count({ where: { guildId } });
  }

  /**
   * 1-based position within a guild by points (how many scored higher, plus 1).
   */
  async rankByPoints(guildId: string, points: number): Promise<number> {
    const above = await prisma.guildScore.count({
      where: { guildId, points: { gt: points } },
    });
    return above + 1;
  }
}

export const guildScoreRepository = new GuildScoreRepository();
