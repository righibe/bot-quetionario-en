/**
 * Core game-rule constants. Tweak these to rebalance the game without touching
 * business logic.
 */

/** Number of questions every user answers per day. */
export const DAILY_QUESTION_COUNT = 5;

/** Points awarded per correct answer. */
export const POINTS_PER_CORRECT_ANSWER = 20;

/** Maximum points obtainable in a single day. */
export const MAX_DAILY_POINTS = DAILY_QUESTION_COUNT * POINTS_PER_CORRECT_ANSWER;

/** How many users to show in the leaderboard. */
export const RANKING_SIZE = 5;

/** Orange color used for every milestone role (decimal of #E67E22). */
export const ROLE_COLOR_ORANGE = 0xe67e22;

/** Embed accent color (Discord "blurple"-ish orange brand). */
export const BRAND_COLOR = 0xe67e22;

/**
 * Streak milestones (in consecutive days) that grant an automatic role.
 * The role name MUST be exactly `${days} dias 🔥`.
 */
export const STREAK_MILESTONES = [10, 20, 30, 60, 100, 300, 600, 1000] as const;

export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

/** Builds the canonical milestone role name, e.g. `10 dias 🔥`. */
export function milestoneRoleName(days: number): string {
  return `${days} dias 🔥`;
}

/** All milestone role names the bot manages. */
export const MILESTONE_ROLE_NAMES: string[] = STREAK_MILESTONES.map(milestoneRoleName);
