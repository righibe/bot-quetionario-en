/**
 * Stable custom-id prefixes for interactive components (buttons / modals).
 *
 * Format conventions:
 *   daily:mc:<optionIndex>   -> a multiple-choice answer button
 *   daily:text               -> button that opens the text-input modal
 *   daily:modal              -> the submitted text-input modal
 *   daily:start              -> button to (re)start the daily flow
 *
 * Keeping these centralized avoids "magic strings" scattered across handlers.
 */
export const CUSTOM_IDS = {
  daily: {
    multipleChoicePrefix: 'daily:mc:',
    openTextModal: 'daily:text',
    textModal: 'daily:modal',
    textModalInput: 'daily:modal:input',
    start: 'daily:start',
  },
} as const;

/** Builds a multiple-choice button custom id for a given option index. */
export function mcButtonId(optionIndex: number): string {
  return `${CUSTOM_IDS.daily.multipleChoicePrefix}${optionIndex}`;
}

/** Parses a multiple-choice button custom id back into an option index. */
export function parseMcButtonId(customId: string): number | null {
  if (!customId.startsWith(CUSTOM_IDS.daily.multipleChoicePrefix)) return null;
  const raw = customId.slice(CUSTOM_IDS.daily.multipleChoicePrefix.length);
  const idx = Number.parseInt(raw, 10);
  return Number.isInteger(idx) ? idx : null;
}
