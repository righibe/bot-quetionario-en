import { User } from '@prisma/client';
import { Question, MultipleChoiceQuestion, isMultipleChoice } from '../interfaces';
import { AnswerOutcome, DailySession } from '../types';
import { DAILY_QUESTION_COUNT } from '../constants';
import { dateKey, toUtcDateOnly, diffInDays } from '../utils/date';
import { createLogger } from '../utils/logger';
import { dailyQuestionRepository } from '../repositories';
import { validateMultipleChoice } from '../validators';
import { apiClientService } from './apiClient.service';
import { questionService } from './question.service';
import { userService, DailyCompletionResult } from './user.service';

const log = createLogger('DailyService');

/** Extends the basic outcome with the final completion payload when finished. */
export interface SubmitResult extends AnswerOutcome {
  completion?: DailyCompletionResult;
}

/**
 * Orchestrates the per-user daily quiz flow.
 *
 * Sessions are held in memory (they only matter for the few seconds a user is
 * answering). All durable state lives in PostgreSQL. The flow is fully built on
 * ephemeral interactions and buttons — every question (including translations)
 * is normalized into multiple choice, so no Discord modal is ever shown and no
 * chat messages are ever read.
 */
export class DailyService {
  private sessions = new Map<string, DailySession>();
  /** Per-user processing lock to prevent double-submit races. */
  private locks = new Set<string>();

  /** True if the user already finished today's challenge. */
  hasCompletedToday(user: User, now: Date = new Date()): boolean {
    if (!user.lastDailyCompleted) return false;
    return diffInDays(user.lastDailyCompleted, toUtcDateOnly(now)) === 0;
  }

  /**
   * Returns today's question ids, generating and persisting them on the fly if
   * the cron job has not run yet (e.g. first ever boot of the day).
   */
  async getTodayQuestionIds(now: Date = new Date()): Promise<number[]> {
    const today = toUtcDateOnly(now);
    let rows = await dailyQuestionRepository.findByDate(today);

    if (rows.length === 0) {
      const ids = questionService.pickRandomIds(DAILY_QUESTION_COUNT);
      rows = await dailyQuestionRepository.setForDate(today, ids);
      log.info(`Generated ${rows.length} daily questions for ${dateKey(today)}.`);
    }

    return rows.map((r) => r.questionId);
  }

  /** Resolves today's questions as full objects. */
  async getTodayQuestions(now: Date = new Date()): Promise<Question[]> {
    const ids = await this.getTodayQuestionIds(now);
    return questionService.getManyByIds(ids);
  }

  /** Whether a live session currently exists for the user. */
  hasActiveSession(discordId: string): boolean {
    return this.sessions.has(discordId);
  }

  getSession(discordId: string): DailySession | undefined {
    return this.sessions.get(discordId);
  }

  /** Starts a new in-memory session for the user. */
  async startSession(
    user: User,
    discordId: string,
    guildId: string | null,
    now: Date = new Date(),
  ): Promise<DailySession> {
    // Normalize every question into a button-answerable multiple choice so the
    // whole run never needs a modal.
    const raw = await this.getTodayQuestions(now);
    const questions = raw.map((q) => questionService.toMultipleChoice(q));

    const session: DailySession = {
      userId: user.id,
      discordId,
      guildId,
      dateKey: dateKey(now),
      questions,
      currentIndex: 0,
      correctCount: 0,
      results: [],
      startedAt: Date.now(),
    };

    this.sessions.set(discordId, session);
    return session;
  }

  /** The question the user is currently on, or null if finished. */
  currentQuestion(discordId: string): MultipleChoiceQuestion | null {
    const session = this.sessions.get(discordId);
    if (!session) return null;
    return session.questions[session.currentIndex] ?? null;
  }

  /** Submits a multiple-choice answer for the current question. */
  submitMultipleChoice(discordId: string, optionIndex: number): Promise<SubmitResult> {
    return this.submit(discordId, (q) =>
      isMultipleChoice(q) ? validateMultipleChoice(q, optionIndex) : false,
    );
  }

  /**
   * Core submit pipeline shared by both answer types.
   * Evaluates correctness, advances the cursor and, when the last question is
   * answered, persists everything (answers + points + streak).
   */
  private async submit(
    discordId: string,
    evaluate: (q: Question) => boolean,
  ): Promise<SubmitResult> {
    if (this.locks.has(discordId)) {
      throw new Error('A previous answer is still being processed.');
    }

    const session = this.sessions.get(discordId);
    if (!session) {
      throw new Error('No active daily session.');
    }

    const question = session.questions[session.currentIndex];
    if (!question) {
      throw new Error('No current question to answer.');
    }

    this.locks.add(discordId);
    try {
      const isCorrect = evaluate(question);
      session.results.push(isCorrect);
      if (isCorrect) session.correctCount += 1;
      session.currentIndex += 1;

      const finished = session.currentIndex >= session.questions.length;
      const nextQuestion = finished
        ? null
        : session.questions[session.currentIndex] ?? null;

      const outcome: SubmitResult = {
        isCorrect,
        correctAnswer: question.answer,
        finished,
        nextQuestion,
        questionNumber: session.currentIndex,
        totalQuestions: session.questions.length,
      };

      if (finished) {
        outcome.completion = await this.finalize(session);
        this.sessions.delete(discordId);
      }

      return outcome;
    } finally {
      this.locks.delete(discordId);
    }
  }

  /**
   * Finalizes a completed session. The bot no longer writes points/scores to the
   * database — it reports the validated answers to the private events API (the
   * single source of truth) and returns a deterministic preview for the summary.
   */
  private async finalize(session: DailySession): Promise<DailyCompletionResult> {
    const user = await userService.findByDiscordId(session.discordId);
    if (!user) {
      throw new Error('User vanished mid-session.');
    }

    // Advisory guard only: `lastDailyCompleted` is now written asynchronously by
    // the events worker, so this read can be stale and is NOT the real replay
    // protection — the API's EventLog idempotency (per guild/user/question/day)
    // is the authoritative dedup. This just avoids obvious same-process replays.
    if (this.hasCompletedToday(user)) {
      log.warn(`Duplicate completion ignored for ${session.discordId}.`);
      return userService.previewCompletion(user, 0);
    }

    // Report to the events API. Fire-and-forget: the user's summary must not wait
    // on the network, and the API is idempotent so retries never double-count.
    void this.reportToEventsApi(session, user);

    // Deterministic preview for the summary; the worker persists the same values.
    return userService.previewCompletion(user, session.correctCount);
  }

  /**
   * Sends one answer event per question plus a daily-completed event to the
   * private events API. Best-effort (the client never throws); all points and
   * scores are recalculated and stored server-side.
   */
  private async reportToEventsApi(session: DailySession, user: User): Promise<void> {
    if (!session.guildId) {
      log.warn(
        `No guildId for ${session.discordId}'s completion — scores not reported ` +
          '(the daily challenge should always start from a server channel).',
      );
      return;
    }

    const base = {
      guildId: session.guildId,
      userId: session.discordId,
      username: user.username,
      // Pin events to the session's UTC day so idempotency/streak are stable
      // even if the request is processed across a midnight boundary.
      dayKey: session.dateKey,
    };

    await Promise.all(
      session.questions.map((q, i) =>
        apiClientService.reportAnswer({
          ...base,
          questionId: q.id,
          isCorrect: session.results[i] ?? false,
        }),
      ),
    );

    await apiClientService.reportDailyCompleted(base);
  }

  /** Cancels / clears a user's session (used on errors or restart). */
  endSession(discordId: string): void {
    this.sessions.delete(discordId);
  }
}

export const dailyService = new DailyService();
