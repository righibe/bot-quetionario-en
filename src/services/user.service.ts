import { User } from '@prisma/client';
import {
  guildScoreRepository,
  userRepository,
  GuildScoreWithUser,
} from '../repositories';
import { POINTS_PER_CORRECT_ANSWER } from '../constants';
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
   * Computes the result of a finished daily run for DISPLAY ONLY — it does NOT
   * touch the database. Points and scores are now owned exclusively by the
   * closed-source events API (the single source of truth): the bot reports the
   * answers and the API recalculates/persists them. These numbers are
   * deterministic (points = correct × 20; streak from the user's last
   * completion), so the summary the user sees matches what the worker will
   * persist a moment later.
   */
  previewCompletion(
    user: User,
    correctCount: number,
    now: Date = new Date(),
  ): DailyCompletionResult {
    const pointsEarned = correctCount * POINTS_PER_CORRECT_ANSWER;

    const streak = streakService.computeOnCompletion(
      user.currentStreak,
      user.bestStreak,
      user.lastDailyCompleted,
      now,
    );

    return { user, pointsEarned, streak };
  }

  /** Top N users for the GLOBAL leaderboard (across all servers). */
  getLeaderboard(limit: number): Promise<User[]> {
    return userRepository.findTop(limit);
  }

  /** Top N scorers within a single server. */
  getGuildLeaderboard(
    guildId: string,
    limit: number,
  ): Promise<GuildScoreWithUser[]> {
    return guildScoreRepository.findTop(guildId, limit);
  }

  /** The user's 1-based position in the global ranking and the total players. */
  async getRank(user: User): Promise<{ position: number; total: number }> {
    const [position, total] = await Promise.all([
      userRepository.rankByPoints(user.points),
      userRepository.count(),
    ]);
    return { position, total };
  }

  /**
   * The user's 1-based position WITHIN a server and that server's player count,
   * plus the points they earned there. `position` is 0 and `points` is 0 when
   * the user has not scored in this server yet.
   */
  async getGuildRank(
    guildId: string,
    userId: string,
  ): Promise<{ position: number; total: number; points: number }> {
    const score = await guildScoreRepository.findOne(guildId, userId);
    const total = await guildScoreRepository.count(guildId);

    if (!score || score.points === 0) {
      return { position: 0, total, points: 0 };
    }

    const position = await guildScoreRepository.rankByPoints(guildId, score.points);
    return { position, total, points: score.points };
  }
}

export const userService = new UserService();
