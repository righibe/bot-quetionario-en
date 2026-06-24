import { Prisma, User } from '@prisma/client';
import { prisma } from '../database';

/**
 * Data-access layer for the User model. Contains ONLY persistence concerns,
 * no business rules (those live in the services).
 */
export class UserRepository {
  /** Finds a user by their Discord ID. */
  findByDiscordId(discordId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { discordId } });
  }

  /**
   * Returns an existing user or creates a fresh one, keeping the username in
   * sync. This is the canonical entry point used by command handlers.
   */
  async ensureUser(discordId: string, username: string): Promise<User> {
    return prisma.user.upsert({
      where: { discordId },
      update: { username },
      create: { discordId, username },
    });
  }

  /** Applies a partial update to a user. */
  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  /** Returns the top SCORING users (points > 0), ordered by points then streak. */
  findTop(limit: number): Promise<User[]> {
    return prisma.user.findMany({
      where: { points: { gt: 0 } },
      orderBy: [{ points: 'desc' }, { bestStreak: 'desc' }, { updatedAt: 'asc' }],
      take: limit,
    });
  }

  /**
   * Number of RANKED users — only those who actually scored (points > 0). People
   * who merely opened the bot but never completed a challenge are not counted.
   */
  count(): Promise<number> {
    return prisma.user.count({ where: { points: { gt: 0 } } });
  }

  /**
   * 1-based ranking position by points (how many users have strictly more
   * points, plus one). Ties share the lower bound, which is fine for display.
   */
  async rankByPoints(points: number): Promise<number> {
    const above = await prisma.user.count({ where: { points: { gt: points } } });
    return above + 1;
  }
}

export const userRepository = new UserRepository();
