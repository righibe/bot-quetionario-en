import cron, { ScheduledTask } from 'node-cron';
import { Client } from 'discord.js';
import { env } from '../config';
import { DAILY_QUESTION_COUNT } from '../constants';
import { dailyQuestionRepository } from '../repositories';
import { dailyPanelService, questionService, rankingService } from '../services';
import { toUtcDateOnly, dateKey } from '../utils/date';
import { createLogger } from '../utils/logger';

const log = createLogger('DailyJob');

/**
 * Schedules the daily reset. At the configured time (default: midnight in TZ):
 *   1. selects the new 5 questions of the day;
 *   2. persists them in DailyQuestion (which implicitly resets availability,
 *      since "completed today" is computed from the UTC date);
 *   3. refreshes the ranking;
 *   4. refreshes the permanent panel in the daily-questions channel.
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

    try {
      await dailyPanelService.updateChannel(client);
    } catch (err) {
      log.error('Failed to refresh daily panel during rollover.', err);
    }
  }
}

export const dailyJob = new DailyJob();
