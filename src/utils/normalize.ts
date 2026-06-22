/**
 * Text normalization helpers used to compare free-text answers leniently.
 *
 * The goal is to accept small writing variations on `text_input` questions:
 *   - case-insensitive
 *   - collapse repeated / leading / trailing whitespace
 *   - strip trailing punctuation (. ! ? ; , : …)
 *   - normalize accents (so "café" === "cafe")
 *   - normalize a few typographic characters (smart quotes, dashes)
 */

/** Removes diacritics (accents) using Unicode normalization. */
function stripAccents(value: string): string {
  // ̀-ͯ is the Unicode "combining diacritical marks" block.
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Produces a canonical form of a string for lenient comparison.
 */
export function normalizeAnswer(value: string): string {
  if (!value) return '';

  let result = value.trim().toLowerCase();

  // Normalize typographic variants to ASCII equivalents.
  result = result
    .replace(/[‘’ʼ]/g, "'") // smart single quotes / apostrophes
    .replace(/[“”]/g, '"') // smart double quotes
    .replace(/[–—−]/g, '-'); // en/em dash, minus sign

  result = stripAccents(result);

  // Strip ALL trailing punctuation/symbols.
  result = result.replace(/[\s.!?;,:…]+$/g, '');

  // Collapse any internal whitespace runs into a single space.
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Lenient equality check between a user answer and an accepted answer.
 */
export function answersMatch(userAnswer: string, accepted: string): boolean {
  return normalizeAnswer(userAnswer) === normalizeAnswer(accepted);
}
