import { diffInDays, toUtcDateOnly } from '../utils/date';

export interface StreakUpdate {
  currentStreak: number;
  bestStreak: number;
  isNewBest: boolean;
  /** True if the streak was reset to 1 because a day was missed. */
  wasReset: boolean;
}

/**
 * Pure streak computation. No I/O — fully unit-testable.
 *
 * Rules:
 *  - First ever completion -> streak = 1.
 *  - Completed yesterday    -> streak + 1 (consecutive).
 *  - Already completed today -> unchanged (defensive; callers gate on this).
 *  - Missed one or more days -> reset to 1.
 *
 * "A day" is a UTC calendar day, so a streak survives as long as the user
 * completes the daily within the following calendar day.
 */
export class StreakService {
  computeOnCompletion(
    previousCurrentStreak: number,
    previousBestStreak: number,
    lastDailyCompleted: Date | null,
    now: Date = new Date(),
  ): StreakUpdate {
    const today = toUtcDateOnly(now);

    let current: number;
    let wasReset = false;

    if (!lastDailyCompleted) {
      current = 1;
    } else {
      const gap = diffInDays(lastDailyCompleted, today);
      if (gap <= 0) {
        // Already counted today — keep as is (defensive guard).
        current = Math.max(previousCurrentStreak, 1);
      } else if (gap === 1) {
        current = previousCurrentStreak + 1;
      } else {
        current = 1;
        wasReset = true;
      }
    }

    const best = Math.max(previousBestStreak, current);

    return {
      currentStreak: current,
      bestStreak: best,
      isNewBest: best > previousBestStreak,
      wasReset,
    };
  }
}

export const streakService = new StreakService();
