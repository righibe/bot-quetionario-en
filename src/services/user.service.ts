import { User } from '@prisma/client';
import { userRepository } from '../repositories';
import { POINTS_PER_CORRECT_ANSWER } from '../constants';
import { toUtcDateOnly } from '../utils/date';
import { streakService, StreakUpdate } from './streak.service';

export interface ProfileStats {
  username: string;
  points: number;
  currentStreak: number;
  bestStreak: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  /** 0..100, rounded to 1 decimal. */
  accuracy: number;
}

export interface DailyCompletionResult {
  user: User;
  pointsEarned: number;
  streak: StreakUpdate;
}

/**
 * Business logic around the User aggregate: profile stats and the transactional
 * finalization of a completed daily challenge.
 */
export class UserService {
  /** Ensures a user row exists and keeps the username fresh. */
  ensureUser(discordId: string, username: string): Promise<User> {
    return userRepository.ensureUser(discordId, username);
  }

  findByDiscordId(discordId: string): Promise<User | null> {
    return userRepository.findByDiscordId(discordId);
  }

  /** Computes derived profile statistics for display. */
  buildProfile(user: User): ProfileStats {
    const accuracy =
      user.totalQuestionsAnswered === 0
        ? 0
        : Math.round(
            (user.totalCorrectAnswers / user.totalQuestionsAnswered) * 1000,
          ) / 10;

    return {
      username: user.username,
      points: user.points,
      currentStreak: user.currentStreak,
      bestStreak: user.bestStreak,
      totalQuestionsAnswered: user.totalQuestionsAnswered,
      totalCorrectAnswers: user.totalCorrectAnswers,
      accuracy,
    };
  }

  /**
   * Finalizes a completed daily run: awards points, updates totals, advances the
   * streak and records the completion day. Persisted in one update.
   */
  async applyDailyCompletion(
    user: User,
    correctCount: number,
    totalQuestions: number,
    now: Date = new Date(),
  ): Promise<DailyCompletionResult> {
    const pointsEarned = correctCount * POINTS_PER_CORRECT_ANSWER;

    const streak = streakService.computeOnCompletion(
      user.currentStreak,
      user.bestStreak,
      user.lastDailyCompleted,
      now,
    );

    const updated = await userRepository.update(user.id, {
      points: { increment: pointsEarned },
      totalCorrectAnswers: { increment: correctCount },
      totalQuestionsAnswered: { increment: totalQuestions },
      currentStreak: streak.currentStreak,
      bestStreak: streak.bestStreak,
      lastDailyCompleted: toUtcDateOnly(now),
    });

    return { user: updated, pointsEarned, streak };
  }

  /** Top N users for the leaderboard. */
  getLeaderboard(limit: number): Promise<User[]> {
    return userRepository.findTop(limit);
  }

  /** The user's 1-based position in the global ranking and the total players. */
  async getRank(user: User): Promise<{ position: number; total: number }> {
    const [position, total] = await Promise.all([
      userRepository.rankByPoints(user.points),
      userRepository.count(),
    ]);
    return { position, total };
  }
}

export const userService = new UserService();
