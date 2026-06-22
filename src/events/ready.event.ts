import { ActivityType, Client, Events } from 'discord.js';
import { BotEvent } from '../interfaces';
import { dailyService, rankingService, roleService } from '../services';
import { createLogger } from '../utils/logger';

const log = createLogger('Ready');

/**
 * Fired once when the bot logs in. Bootstraps per-guild state:
 *  - ensures milestone roles exist;
 *  - ensures today's daily questions are generated;
 *  - publishes the initial ranking.
 */
export const readyEvent: BotEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client<true>): Promise<void> {
    log.info(`Logged in as ${client.user.tag} (serving ${client.guilds.cache.size} guild(s)).`);

    client.user.setPresence({
      status: 'online',
      activities: [{ name: '/daily • learn English 🔥', type: ActivityType.Playing }],
    });

    // Ensure today's questions exist so /daily works immediately.
    try {
      await dailyService.getTodayQuestionIds();
    } catch (err) {
      log.error('Failed to ensure today’s daily questions.', err);
    }

    // Ensure milestone roles exist in every guild (best-effort, permission-guarded).
    for (const guild of client.guilds.cache.values()) {
      try {
        await roleService.ensureRoles(guild);
      } catch (err) {
        log.warn(`Failed to ensure roles for guild ${guild.id}.`, err);
      }
    }

    // Publish the initial ranking.
    try {
      await rankingService.updateRankingChannel(client);
    } catch (err) {
      log.warn('Failed to publish initial ranking.', err);
    }

    log.info('Startup bootstrap complete.');
  },
};
