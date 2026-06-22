import { UserAnswer } from '@prisma/client';
import { prisma } from '../database';

/**
 * Data-access layer for the UserAnswer model.
 */
export class UserAnswerRepository {
  /** Records a single answered question. */
  create(data: {
    userId: string;
    questionId: number;
    isCorrect: boolean;
  }): Promise<UserAnswer> {
    return prisma.userAnswer.create({ data });
  }

  /** Records multiple answers atomically. */
  async createMany(
    rows: { userId: string; questionId: number; isCorrect: boolean }[],
  ): Promise<number> {
    const result = await prisma.userAnswer.createMany({ data: rows });
    return result.count;
  }

  /** Counts how many of the given question ids the user already answered today. */
  countAnsweredAmong(userId: string, questionIds: number[]): Promise<number> {
    return prisma.userAnswer.count({
      where: { userId, questionId: { in: questionIds } },
    });
  }
}

export const userAnswerRepository = new UserAnswerRepository();
