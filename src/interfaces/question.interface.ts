/** The two supported question formats. */
export type QuestionType = 'multiple_choice' | 'text_input';

/** Base shape shared by every question. */
interface BaseQuestion {
  id: number;
  type: QuestionType;
  question: string;
  /** The canonical correct answer. */
  answer: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  /** 2..5 options; `answer` must be one of them. */
  options: string[];
}

export interface TextInputQuestion extends BaseQuestion {
  type: 'text_input';
  /**
   * Optional list of additional accepted answers (already in their natural
   * form). The validator normalizes everything before comparing.
   */
  acceptedAnswers?: string[];
}

export type Question = MultipleChoiceQuestion | TextInputQuestion;

export function isMultipleChoice(q: Question): q is MultipleChoiceQuestion {
  return q.type === 'multiple_choice';
}

export function isTextInput(q: Question): q is TextInputQuestion {
  return q.type === 'text_input';
}
