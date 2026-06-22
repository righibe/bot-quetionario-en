import { MultipleChoiceQuestion } from '../interfaces';

/**
 * The in-memory state of a single user's daily run. Questions are stored as
 * multiple choice because every question (including translations) is normalized
 * to MC when the session starts, so the whole flow is button-only.
 */
export interface DailySession {
  userId: string;
  discordId: string;
  guildId: string | null;
  /** UTC date-only key, e.g. 2026-06-21. */
  dateKey: string;
  questions: MultipleChoiceQuestion[];
  currentIndex: number;
  correctCount: number;
  /** Per-question correctness, in order. */
  results: boolean[];
  startedAt: number;
}

/** Outcome returned after a user submits an answer for the current question. */
export interface AnswerOutcome {
  isCorrect: boolean;
  correctAnswer: string;
  finished: boolean;
  nextQuestion: MultipleChoiceQuestion | null;
  questionNumber: number;
  totalQuestions: number;
}
