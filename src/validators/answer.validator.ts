import { Question, isMultipleChoice, isTextInput } from '../interfaces';
import { answersMatch } from '../utils/normalize';

/**
 * Validates a user's answer against a question.
 *
 *  - multiple_choice: the provided option index must point to the correct option.
 *  - text_input: lenient comparison against the canonical answer plus any
 *    additional accepted answers, after normalization.
 */

/** Validates a multiple-choice answer by option index. */
export function validateMultipleChoice(
  question: Question,
  optionIndex: number,
): boolean {
  if (!isMultipleChoice(question)) return false;
  const chosen = question.options[optionIndex];
  if (chosen === undefined) return false;
  return chosen === question.answer;
}

/** Validates a free-text answer with normalization tolerance. */
export function validateTextInput(question: Question, rawInput: string): boolean {
  if (!isTextInput(question)) return false;

  const candidates = [question.answer, ...(question.acceptedAnswers ?? [])];
  return candidates.some((candidate) => answersMatch(rawInput, candidate));
}
