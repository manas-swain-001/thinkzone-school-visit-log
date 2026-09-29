/**
 * India Standard Time helpers.
 *
 * IST is a fixed UTC+05:30 and has never observed daylight saving, so a plain
 * shift is exact and needs no timezone database. This mirrors the server's
 * server/src/utils/ist.js deliberately: the same month boundary on both sides.
 */

const IST_OFFSET_MINUTES = 330;
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export type YearMonth = { year: number; month: number };

/** The IST calendar month a moment falls in. month is 1-12. */
export function istYearMonth(date: Date = new Date()): YearMonth {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

/** Sortable month key, e.g. "2026-09". */
export function monthKey({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Human label, e.g. "September 2026". */
export function monthLabel({ year, month }: YearMonth): string {
  return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
}

/** Orders two months. Negative when `a` is earlier than `b`. */
export function compareMonths(a: YearMonth, b: YearMonth): number {
  return a.year * 12 + (a.month - 1) - (b.year * 12 + (b.month - 1));
}

/** True when `a` is an earlier month than `b`. */
export function isEarlierMonth(a: YearMonth, b: YearMonth): boolean {
  return compareMonths(a, b) < 0;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Renders an ISO timestamp as IST wall-clock time, e.g. "28/09/2026, 14:35". */
export function formatIstTimestamp(iso: string | number | Date): string {
  const moment = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(moment.getTime())) return '--';
  const shifted = new Date(moment.getTime() + IST_OFFSET_MS);
  return (
    `${pad(shifted.getUTCDate())}/${pad(shifted.getUTCMonth() + 1)}/${shifted.getUTCFullYear()}` +
    `, ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`
  );
}

/** "just now" / "12 min ago" / "28/09/2026, 14:35" for compact list rows. */
export function formatRelativeIst(iso: string, now: Date = new Date()): string {
  const moment = new Date(iso);
  if (Number.isNaN(moment.getTime())) return '--';
  const minutes = Math.floor((now.getTime() - moment.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`;
  return formatIstTimestamp(moment);
}
