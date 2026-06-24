import { env } from '../config';
import { createLogger } from '../utils/logger';

const log = createLogger('EventsApiClient');

/** A single answer the bot reports to the private events API. */
export interface AnswerEvent {
  guildId: string;
  /** Discord user id. */
  userId: string;
  username: string;
  questionId: number;
  isCorrect: boolean;
  /** UTC challenge day (YYYY-MM-DD) — pins idempotency/streak to the play day. */
  dayKey: string;
}

/** Reported once when a user finishes the whole daily challenge. */
export interface DailyCompletedEvent {
  guildId: string;
  userId: string;
  username: string;
  dayKey: string;
}

/**
 * Thin HTTP client to the closed-source events API. The bot does NOT compute or
 * persist points — it only reports validated events; the API recalculates and
 * stores everything. All calls are best-effort and never throw to the caller:
 * the user-facing quiz must never break because the API is momentarily down.
 *
 * The API key is sent in the X-API-KEY header and is NEVER logged.
 */
export class ApiClientService {
  private readonly maxAttempts = 2;

  /** Reports one answered question. No-op when the API is not configured. */
  reportAnswer(event: AnswerEvent): Promise<void> {
    return this.post('/events/answer', event, `answer q${event.questionId}`);
  }

  /** Reports daily completion (drives streak/last-completed server-side). */
  reportDailyCompleted(event: DailyCompletedEvent): Promise<void> {
    return this.post('/events/daily-completed', event, 'daily-completed');
  }

  /** POSTs a JSON body with the API key, retrying transient failures. */
  private async post(path: string, body: unknown, label: string): Promise<void> {
    if (!env.events.enabled) {
      log.warn(
        `Events API not configured (EVENTS_API_URL / EVENTS_API_KEY) — ` +
          `skipping "${label}". Scores will NOT be recorded.`,
      );
      return;
    }

    const url = `${env.events.apiUrl}${path}`;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), env.events.timeoutMs);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Never logged anywhere.
            'X-API-KEY': env.events.apiKey,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (res.ok) return;

        // 4xx are deterministic (bad/duplicate/invalid) — do not retry.
        if (res.status >= 400 && res.status < 500) {
          log.warn(`Events API rejected "${label}" with ${res.status}. Not retrying.`);
          return;
        }
        log.warn(`Events API "${label}" failed with ${res.status} (attempt ${attempt}).`);
      } catch (err) {
        log.warn(`Events API "${label}" request error (attempt ${attempt}).`, err);
      } finally {
        clearTimeout(timer);
      }
    }

    log.error(`Events API "${label}" gave up after ${this.maxAttempts} attempts.`);
  }
}

export const apiClientService = new ApiClientService();
