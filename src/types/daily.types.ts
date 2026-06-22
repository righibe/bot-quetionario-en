import { Question } from '../interfaces';

/** The in-memory state of a single user's daily run. */
export interface DailySession {
  userId: string;
  discordId: string;
  guildId: string | null;
  /** UTC date-only key, e.g. 2026-06-21. */
  dateKey: string;
  questions: Question[];
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
  nextQuestion: Question | null;
  questionNumber: number;
  totalQuestions: number;
}
