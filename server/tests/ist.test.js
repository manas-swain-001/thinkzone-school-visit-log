import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  istParts,
  istYearMonth,
  currentIstYearMonth,
  monthKey,
  monthLabel,
  isMoreThanMinutesAhead,
  IST_OFFSET_MINUTES,
} from '../src/utils/ist.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const istModuleUrl = pathToFileURL(path.join(here, '..', 'src', 'utils', 'ist.js')).href;

test('the offset is the fixed Indian +05:30', () => {
  assert.equal(IST_OFFSET_MINUTES, 330);
});

test('reads a normal moment as IST', () => {
  // 05:32:10 UTC is 11:02:10 the same day in IST.
  assert.deepEqual(istParts('2026-09-28T05:32:10.000Z'), {
    year: 2026, month: 9, day: 28, hour: 11, minute: 2, second: 10,
  });
});

test('an evening UTC time is already the next IST day', () => {
  // 18:29 UTC = 23:59 the same day, still the 28th.
  assert.equal(istParts('2026-09-28T18:29:00.000Z').day, 28);
  // 18:31 UTC = 00:01 the next day, the 29th.
  assert.equal(istParts('2026-09-28T18:31:00.000Z').day, 29);
});

test('midnight IST is the month boundary, not midnight UTC', () => {
  // One second before IST midnight -> still September.
  assert.deepEqual(istYearMonth('2026-09-30T18:29:59.999Z'), { year: 2026, month: 9 });
  // Exactly IST midnight -> October. This is the doc's "visit made offline late
  // on the last day of a month" case: it must stay September even though it is
  // only synced the following morning.
  assert.deepEqual(istYearMonth('2026-09-30T18:30:00.000Z'), { year: 2026, month: 10 });
});

test('a visit at 23:50 IST on the last day keeps its own month', () => {
  const visitedAt = '2026-09-30T18:20:00.000Z'; // 23:50 IST on 30 Sep
  assert.deepEqual(istYearMonth(visitedAt), { year: 2026, month: 9 });
});

test('rolls the year over correctly', () => {
  assert.deepEqual(istYearMonth('2026-12-31T18:29:59.999Z'), { year: 2026, month: 12 });
  assert.deepEqual(istYearMonth('2026-12-31T18:30:00.000Z'), { year: 2027, month: 1 });
});

test('handles the shortest month, 28 Feb', () => {
  // 2028 is a leap year, so 29 Feb exists; 2026 does not have one.
  assert.deepEqual(istYearMonth('2028-02-29T18:30:00.000Z'), { year: 2028, month: 3 });
  assert.deepEqual(istYearMonth('2028-02-28T18:29:59.999Z'), { year: 2028, month: 2 });
});

test('accepts Date objects, strings and epoch millis alike', () => {
  const iso = '2026-07-15T10:00:00.000Z';
  const expected = { year: 2026, month: 7 };
  assert.deepEqual(istYearMonth(new Date(iso)), expected);
  assert.deepEqual(istYearMonth(iso), expected);
  assert.deepEqual(istYearMonth(Date.parse(iso)), expected);
});

test('rejects an invalid date instead of silently returning NaN', () => {
  assert.throws(() => istYearMonth('not-a-date'), TypeError);
});

test('current month agrees with the manual calculation', () => {
  const now = new Date('2026-08-09T04:15:00.000Z'); // 09:45 IST on 9 Aug
  assert.deepEqual(currentIstYearMonth(now), { year: 2026, month: 8 });
});

test('monthKey and monthLabel format correctly', () => {
  assert.equal(monthKey({ year: 2026, month: 9 }), '2026-09');
  assert.equal(monthKey({ year: 2026, month: 12 }), '2026-12');
  assert.equal(monthLabel({ year: 2026, month: 9 }), 'September 2026');
  assert.equal(monthLabel({ year: 2026, month: 1 }), 'January 2026');
});

test('future tolerance is measured in minutes', () => {
  const now = new Date('2026-09-28T10:00:00.000Z');
  assert.equal(isMoreThanMinutesAhead('2026-09-28T10:04:00.000Z', 5, now), false);
  assert.equal(isMoreThanMinutesAhead('2026-09-28T10:06:00.000Z', 5, now), true);
  assert.equal(isMoreThanMinutesAhead('2026-09-28T09:00:00.000Z', 5, now), false);
});

// The doc requires that the server's own timezone cannot change any result.
// Re-run the same instant in child processes with very different TZ settings.
test('the result does not depend on the server timezone', () => {
  const probe = `
    import { istYearMonth, currentIstYearMonth } from ${JSON.stringify(istModuleUrl)};
    const samples = ['2026-09-30T18:30:00.000Z', '2026-12-31T18:29:59.999Z', '2026-07-01T00:00:00.000Z'];
    console.log(JSON.stringify({
      parsed: samples.map((s) => istYearMonth(s)),
      now: currentIstYearMonth(new Date('2026-03-15T19:00:00.000Z')),
    }));
  `;

  const runIn = (tz) =>
    execFileSync(process.execPath, ['--input-type=module', '-e', probe], {
      encoding: 'utf8',
      env: { ...process.env, TZ: tz },
    }).trim();

  const results = [
    runIn('Asia/Kolkata'),
    runIn('America/New_York'),
    runIn('Pacific/Auckland'),
    runIn('UTC'),
  ];

  assert.equal(new Set(results).size, 1, `timezones disagreed: ${results.join(' | ')}`);
  assert.deepEqual(JSON.parse(results[0]).parsed, [
    { year: 2026, month: 10 },
    { year: 2026, month: 12 },
    { year: 2026, month: 7 },
  ]);
  assert.deepEqual(JSON.parse(results[0]).now, { year: 2026, month: 3 });
});
