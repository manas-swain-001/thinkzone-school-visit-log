/**
 * India Standard Time helpers.
 *
 * IST is a FIXED offset of UTC+05:30 and has never observed daylight saving,
 * so a plain arithmetic shift is exact. That is deliberately better than
 * pulling in a timezone library: no locale, no ICU data and no system
 * timezone on the server can change the result.
 *
 * The single rule for the whole codebase:
 *   the server's own timezone is NEVER allowed to influence a month boundary.
 * Only the functions in this file may decide which month a moment belongs to,
 * and they only ever read UTC parts off a shifted timestamp.
 */

export const IST_OFFSET_MINUTES = 330; // +05:30
export const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Break a moment down into calendar fields as seen in IST.
 * @param {Date|string|number} date
 * @returns {{year:number, month:number, day:number, hour:number, minute:number, second:number}}
 *          month is 1-12, matching human wording ("September" is 9).
 */
export function istParts(date) {
  const moment = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(moment.getTime())) {
    throw new TypeError(`istParts received an invalid date: ${String(date)}`);
  }
  const shifted = new Date(moment.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

/**
 * The IST calendar month a moment falls in. This is the function the whole
 * project means when it says "the month of a visit".
 * @returns {{year:number, month:number}} month is 1-12
 */
export function istYearMonth(date) {
  const { year, month } = istParts(date);
  return { year, month };
}

/** The current IST month, derived from the server clock. */
export function currentIstYearMonth(now = new Date()) {
  return istYearMonth(now);
}

/** Sortable/comparable key for a month, e.g. "2026-09". */
export function monthKey({ year, month }) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Human label for a month, e.g. "September 2026". */
export function monthLabel({ year, month }) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** True when `date` is more than `toleranceMinutes` ahead of `reference`. */
export function isMoreThanMinutesAhead(date, toleranceMinutes, reference = new Date()) {
  const moment = date instanceof Date ? date : new Date(date);
  return moment.getTime() - reference.getTime() > toleranceMinutes * 60 * 1000;
}
