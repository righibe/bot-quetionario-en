/**
 * Date helpers. All "challenge days" are represented as UTC midnight so that
 * the same day boundary is used everywhere regardless of server locale.
 *
 * NOTE: the cron job firing time uses the configured TZ, but the stored daily
 * "date" is always the UTC date of the moment the job ran / the user answered.
 */

/** Returns a new Date set to 00:00:00.000 UTC of the given date. */
export function toUtcDateOnly(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Returns a YYYY-MM-DD key (UTC) for a date. */
export function dateKey(date: Date = new Date()): string {
  return toUtcDateOnly(date).toISOString().slice(0, 10);
}

/** Whole-day difference (b - a) between two date-only values. */
export function diffInDays(a: Date, b: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const start = toUtcDateOnly(a).getTime();
  const end = toUtcDateOnly(b).getTime();
  return Math.round((end - start) / MS_PER_DAY);
}

/** True if the two dates fall on the same UTC calendar day. */
export function isSameUtcDay(a: Date, b: Date): boolean {
  return diffInDays(a, b) === 0;
}
