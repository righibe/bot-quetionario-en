import cron, { ScheduledTask } from 'node-cron';
import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { env } from '../config';
import { BRAND_COLOR, CHANNELS, DAILY_QUESTION_COUNT } from '../constants';
import { dailyQuestionRepository } from '../repositories';
import { questionService, rankingService } from '../services';
import { toUtcDateOnly, dateKey } from '../utils/date';
import { createLogger } from '../utils/logger';

const log = createLogger('DailyJob');

/**
 * Schedules the daily reset. At the configured time (default: midnight in TZ):
 *   1. selects the new 5 questions of the day;
 *   2. persists them in DailyQuestion (which implicitly resets availability,
 *      since "completed today" is computed from the UTC date);
 *   3. refreshes the ranking;
 *   4. announces the new challenge in the daily-questions channel.
 */
export class DailyJob {
  private task: ScheduledTask | null = null;

  start(client: Client): void {
    const expression = env.app.dailyCron;

    if (!cron.validate(expression)) {
      log.error(`Invalid DAILY_CRON expression "${expression}". Daily job NOT started.`);
      return;
    }

    this.task = cron.schedule(
      expression,
      () => {
        void this.run(client);
      },
      { timezone: env.app.timezone },
    );

    log.info(`Daily job scheduled ("${expression}", TZ=${env.app.timezone}).`);
  }

  stop(): void {
    this.task?.stop();
    this.task = null;
  }

  /** Executes one daily rollover. Exposed for manual triggering/testing. */
  async run(client: Client): Promise<void> {
    const today = toUtcDateOnly();
    log.info(`Running daily rollover for ${dateKey(today)}.`);

    try {
      const ids = questionService.pickRandomIds(DAILY_QUESTION_COUNT);
      await dailyQuestionRepository.setForDate(today, ids);
      log.info(`Selected questions [${ids.join(', ')}] for ${dateKey(today)}.`);
    } catch (err) {
      log.error('Failed to roll over daily questions.', err);
    }

    try {
      await rankingService.updateRankingChannel(client);
    } catch (err) {
      log.error('Failed to refresh ranking during rollover.', err);
    }

    await this.announce(client);
  }

  /** Posts a non-intrusive announcement in the daily-questions channel. */
  private async announce(client: Client): Promise<void> {
    const channelId = CHANNELS.dailyQuestions;
    if (!channelId) return;

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased() || channel.isDMBased()) return;

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle('🔥 New daily challenge available!')
        .setDescription(
          'A fresh set of 5 questions is ready.\n' +
            'Use `/daily` to answer and keep your streak alive! 🚀',
        )
        .setTimestamp(new Date());

      await (channel as TextChannel).send({ embeds: [embed] });
    } catch (err) {
      log.warn('Failed to announce new daily challenge.', err);
    }
  }
}

export const dailyJob = new DailyJob();
