import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAnswers } from '../src/services/answerValidation.js';

// Shaped exactly like a real September 2026 document from questionnaires.json.
const questionnaire = {
  year: 2026,
  month: 9,
  title: 'September 2026 school visit',
  questions: [
    { questionId: 'SEP26-Q01', type: 'yesNo', text: 'Was the head teacher present?' },
    { questionId: 'SEP26-Q02', type: 'number', text: 'How many teachers?', min: 0, max: 50 },
    { questionId: 'SEP26-Q05', type: 'singleChoice', text: 'Classroom ready?', options: ['Yes', 'Partly', 'No'] },
    { questionId: 'SEP26-Q09', type: 'number', text: 'No min or max', min: null, max: null },
    { questionId: 'SEP26-Q10', type: 'text', text: 'Any remarks', maxLength: 300, optional: true },
  ],
};

const ok = [
  { questionId: 'SEP26-Q01', value: true },
  { questionId: 'SEP26-Q02', value: 4 },
  { questionId: 'SEP26-Q05', value: 'Partly' },
  { questionId: 'SEP26-Q09', value: 12 },
];

test('a complete, valid set of answers passes', () => {
  assert.deepEqual(validateAnswers(ok, questionnaire), []);
});

test('the optional question may be omitted', () => {
  assert.ok(!validateAnswers(ok, questionnaire).some((e) => e.field.includes('Q10')));
});

test('the optional question may be answered when present', () => {
  const errors = validateAnswers([...ok, { questionId: 'SEP26-Q10', value: 'all good' }], questionnaire);
  assert.deepEqual(errors, []);
});

test('a missing required question is reported', () => {
  const errors = validateAnswers(ok.slice(0, 3), questionnaire);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /SEP26-Q09/);
});

test('a questionId from another month is rejected and says so', () => {
  const errors = validateAnswers([...ok, { questionId: 'JUL26-Q01', value: true }], questionnaire);
  const stale = errors.find((e) => e.field === 'answers.JUL26-Q01');
  assert.ok(stale, 'expected the stale questionId to be rejected');
  assert.match(stale.message, /earlier month/);
});

test('answering the same question twice is rejected', () => {
  const errors = validateAnswers([...ok, { questionId: 'SEP26-Q01', value: false }], questionnaire);
  assert.ok(errors.some((e) => /more than once/.test(e.message)));
});

test('yesNo rejects non-booleans', () => {
  for (const value of ['true', 1, 0, null, 'Yes']) {
    const errors = validateAnswers(
      [...ok.filter((a) => a.questionId !== 'SEP26-Q01'), { questionId: 'SEP26-Q01', value }],
      questionnaire
    );
    assert.ok(errors.length > 0, `expected ${JSON.stringify(value)} to be rejected`);
  }
});

test('number must be a whole number inside min/max', () => {
  const withValue = (value) =>
    validateAnswers([...ok.filter((a) => a.questionId !== 'SEP26-Q02'), { questionId: 'SEP26-Q02', value }], questionnaire);

  assert.deepEqual(withValue(0), [], 'min boundary is allowed');
  assert.deepEqual(withValue(50), [], 'max boundary is allowed');
  assert.ok(withValue(-1).length > 0, 'below min');
  assert.ok(withValue(51).length > 0, 'above max');
  assert.ok(withValue(4.5).length > 0, 'a decimal is not a whole number');
  assert.ok(withValue('4').length > 0, 'a numeric string is not a number');
});

test('number with no min/max accepts any whole number', () => {
  const errors = validateAnswers(
    [...ok.filter((a) => a.questionId !== 'SEP26-Q09'), { questionId: 'SEP26-Q09', value: 999999 }],
    questionnaire
  );
  assert.deepEqual(errors, []);
});

test('singleChoice must be exactly one of the options', () => {
  const withValue = (value) =>
    validateAnswers([...ok.filter((a) => a.questionId !== 'SEP26-Q05'), { questionId: 'SEP26-Q05', value }], questionnaire);

  assert.deepEqual(withValue('Yes'), []);
  assert.ok(withValue('yes').length > 0, 'the match is case sensitive');
  assert.ok(withValue('Maybe').length > 0, 'not one of the options');
  assert.ok(withValue(0).length > 0, 'not a string');
});

test('text is bounded by maxLength', () => {
  const withValue = (value) =>
    validateAnswers([...ok, { questionId: 'SEP26-Q10', value }], questionnaire);

  assert.deepEqual(withValue('x'.repeat(300)), [], 'exactly at the limit');
  assert.ok(withValue('x'.repeat(301)).length > 0, 'one over the limit');
  assert.ok(withValue(12345).length > 0, 'not a string');
});

test('every problem is reported at once, not just the first', () => {
  const errors = validateAnswers(
    [
      { questionId: 'SEP26-Q01', value: 'nope' },
      { questionId: 'SEP26-Q02', value: 900 },
      { questionId: 'SEP26-Q05', value: 'Perhaps' },
    ],
    questionnaire
  );
  // three bad values plus the now-missing required Q09
  assert.equal(errors.length, 4);
});
