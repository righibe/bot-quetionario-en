import { DailyQuestion } from '@prisma/client';
import { prisma } from '../database';
import { toUtcDateOnly } from '../utils/date';

/**
 * Data-access layer for the DailyQuestion model.
 * Each "day" maps to N rows (one per selected question id).
 */
export class DailyQuestionRepository {
  /** Returns all daily questions for the given day (UTC date-only). */
  findByDate(date: Date): Promise<DailyQuestion[]> {
    return prisma.dailyQuestion.findMany({
      where: { date: toUtcDateOnly(date) },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Replaces the question set for a given day with the provided question ids.
   * Idempotent: safe to run multiple times for the same day.
   */
  async setForDate(date: Date, questionIds: number[]): Promise<DailyQuestion[]> {
    const day = toUtcDateOnly(date);

    return prisma.$transaction(async (tx) => {
      await tx.dailyQuestion.deleteMany({ where: { date: day } });
      await tx.dailyQuestion.createMany({
        data: questionIds.map((questionId) => ({ questionId, date: day })),
        skipDuplicates: true,
      });
      return tx.dailyQuestion.findMany({
        where: { date: day },
        orderBy: { createdAt: 'asc' },
      });
    });
  }

  /** Convenience: does the given day already have questions configured? */
  async existsForDate(date: Date): Promise<boolean> {
    const count = await prisma.dailyQuestion.count({
      where: { date: toUtcDateOnly(date) },
    });
    return count > 0;
  }
}

export const dailyQuestionRepository = new DailyQuestionRepository();
