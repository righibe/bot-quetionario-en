import {
  Guild,
  GuildMember,
  PermissionFlagsBits,
  Role,
} from 'discord.js';
import {
  MILESTONE_ROLE_NAMES,
  ROLE_COLOR_ORANGE,
  STREAK_MILESTONES,
  milestoneRoleName,
} from '../constants';
import { createLogger } from '../utils/logger';

const log = createLogger('RoleService');

/**
 * Manages automatic milestone roles ("10 dias 🔥", "20 dias 🔥", ...).
 *
 * Design constraints (privileged-intent free):
 *  - Roles are created on demand by name; NO hard-coded role IDs.
 *  - All work happens with the `GuildMember` provided by an interaction, so we
 *    never monitor members continuously (no GuildMembers intent required).
 *  - Every Discord call is permission-checked and error-guarded: a missing
 *    permission is logged, never thrown, so the game keeps working.
 */
export class RoleService {
  /** Returns the highest milestone reached for a given streak, or null. */
  milestoneForStreak(streak: number): number | null {
    let reached: number | null = null;
    for (const milestone of STREAK_MILESTONES) {
      if (streak >= milestone) reached = milestone;
    }
    return reached;
  }

  /** Does the bot have permission to manage roles in this guild? */
  private canManageRoles(guild: Guild): boolean {
    const me = guild.members.me;
    if (!me) {
      log.warn(`[${guild.id}] Bot member not cached; cannot verify permissions.`);
      return false;
    }
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      log.warn(
        `[${guild.id}] Missing "Manage Roles" permission. Milestone roles disabled.`,
      );
      return false;
    }
    return true;
  }

  /**
   * Ensures every milestone role exists in the guild, creating the missing ones
   * with the orange color. Returns a map of roleName -> Role for the roles that
   * currently exist (created or pre-existing).
   */
  async ensureRoles(guild: Guild): Promise<Map<string, Role>> {
    const result = new Map<string, Role>();

    // Make sure the role cache is populated (no privileged intent needed).
    let roles = guild.roles.cache;
    if (roles.size <= 1) {
      try {
        roles = await guild.roles.fetch();
      } catch (err) {
        log.warn(`[${guild.id}] Failed to fetch roles.`, err);
      }
    }

    for (const name of MILESTONE_ROLE_NAMES) {
      const existing = guild.roles.cache.find((r) => r.name === name);
      if (existing) {
        result.set(name, existing);
        continue;
      }

      if (!this.canManageRoles(guild)) {
        // Cannot create; skip silently per-name (warning already logged).
        continue;
      }

      try {
        const role = await guild.roles.create({
          name,
          color: ROLE_COLOR_ORANGE,
          hoist: false,
          mentionable: false,
          reason: 'English Streak: automatic milestone role',
        });
        result.set(name, role);
        log.info(`[${guild.id}] Created milestone role "${name}".`);
      } catch (err) {
        log.error(`[${guild.id}] Failed to create role "${name}".`, err);
      }
    }

    return result;
  }

  /**
   * Synchronizes a member's milestone role to match their current streak:
   *  - grants the role for the highest reached milestone;
   *  - removes any lower milestone roles so only the highest remains.
   *
   * Returns the granted role name (if any newly relevant), or null.
   */
  async syncMemberRole(member: GuildMember, currentStreak: number): Promise<string | null> {
    const guild = member.guild;
    if (!this.canManageRoles(guild)) return null;

    const targetMilestone = this.milestoneForStreak(currentStreak);
    const targetName = targetMilestone ? milestoneRoleName(targetMilestone) : null;

    // Ensure roles exist (only creates what is missing).
    const roleMap = await this.ensureRoles(guild);

    const me = guild.members.me;
    if (!me) return null;

    // Roles the member currently has that are milestone roles.
    const heldMilestoneRoles = member.roles.cache.filter((r) =>
      MILESTONE_ROLE_NAMES.includes(r.name),
    );

    // Remove every milestone role that is not the target.
    for (const role of heldMilestoneRoles.values()) {
      if (role.name === targetName) continue;
      if (!this.isAssignable(me.roles.highest.position, role)) continue;
      try {
        await member.roles.remove(role, 'English Streak: superseded milestone');
        log.info(`[${guild.id}] Removed "${role.name}" from ${member.user.tag}.`);
      } catch (err) {
        log.error(`[${guild.id}] Failed to remove "${role.name}".`, err);
      }
    }

    if (!targetName) return null;

    const targetRole = roleMap.get(targetName);
    if (!targetRole) {
      log.warn(`[${guild.id}] Target role "${targetName}" unavailable.`);
      return null;
    }

    // Already has it -> nothing to grant.
    if (member.roles.cache.has(targetRole.id)) return null;

    if (!this.isAssignable(me.roles.highest.position, targetRole)) {
      log.warn(
        `[${guild.id}] Cannot assign "${targetName}": bot role is below it in ` +
          `the hierarchy. Move the bot role above the milestone roles.`,
      );
      return null;
    }

    try {
      await member.roles.add(targetRole, 'English Streak: milestone reached');
      log.info(`[${guild.id}] Granted "${targetName}" to ${member.user.tag}.`);
      return targetName;
    } catch (err) {
      log.error(`[${guild.id}] Failed to grant "${targetName}".`, err);
      return null;
    }
  }

  /** A role is assignable only if the bot's highest role is above it. */
  private isAssignable(botHighestPosition: number, role: Role): boolean {
    return botHighestPosition > role.position;
  }
}

export const roleService = new RoleService();
