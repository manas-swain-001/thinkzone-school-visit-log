import type { Answer, Question, Questionnaire } from '@/api/types';
import type { ErrorDetail } from '@/api/errors';

/**
 * What the visit form holds while it is being filled in.
 *
 * Everything stays a string or a boolean until submit: a half-typed "1" in a
 * number box is not yet a number, and re-parsing on every keystroke is what
 * makes a numeric input fight the person typing into it.
 */
export type FormAnswers = Record<string, boolean | string | null>;

export function emptyFormAnswers(questionnaire: Questionnaire): FormAnswers {
  const form: FormAnswers = {};
  for (const question of questionnaire.questions) {
    form[question.questionId] = question.type === 'yesNo' ? null : '';
  }
  return form;
}

function isAnswered(value: boolean | string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

/**
 * The same rules the server applies, run on the device before anything is
 * queued.
 *
 * Server-side validation is still the authority - a visit can be recorded
 * offline and sync days later - but checking here means the field officer
 * finds out while the school is still in front of them, instead of the answers
 * silently failing hours later. The message wording is intentionally close to
 * server/src/services/answerValidation.js.
 */
export function validateForm(
  questionnaire: Questionnaire,
  form: FormAnswers
): ErrorDetail[] {
  const errors: ErrorDetail[] = [];

  for (const question of questionnaire.questions) {
    const field = `answers.${question.questionId}`;
    const value = form[question.questionId];

    if (!isAnswered(value)) {
      if (!question.optional) {
        errors.push({ field, message: `"${question.text}" is required.` });
      }
      continue;
    }

    if (question.type === 'number') {
      const parsed = Number(String(value).trim());
      if (!Number.isInteger(parsed)) {
        errors.push({ field, message: `${question.text} expects a whole number.` });
        continue;
      }
      if (question.min != null && parsed < question.min) {
        errors.push({ field, message: `${question.text} cannot be less than ${question.min}.` });
        continue;
      }
      if (question.max != null && parsed > question.max) {
        errors.push({ field, message: `${question.text} cannot be more than ${question.max}.` });
      }
      continue;
    }

    if (question.type === 'singleChoice' && !(question.options ?? []).includes(String(value))) {
      errors.push({
        field,
        message: `${question.text} expects one of ${(question.options ?? []).join(', ')}.`,
      });
      continue;
    }

    if (question.type === 'text' && question.maxLength != null && String(value).length > question.maxLength) {
      errors.push({
        field,
        message: `${question.text} allows at most ${question.maxLength} characters.`,
      });
    }
  }

  return errors;
}

/**
 * Converts the form into the wire payload.
 *
 * Unanswered optional questions are left out entirely rather than sent as an
 * empty string: the server rejects a value that is present but wrong for the
 * question's type, and omitting is how "not answered" is expressed.
 */
export function toAnswers(questionnaire: Questionnaire, form: FormAnswers): Answer[] {
  const answers: Answer[] = [];

  for (const question of questionnaire.questions) {
    const raw = form[question.questionId];
    if (!isAnswered(raw)) continue;

    const value: Answer['value'] =
      question.type === 'yesNo'
        ? raw === true || raw === 'true'
        : question.type === 'number'
          ? Number(String(raw).trim())
          : String(raw);

    answers.push({ questionId: question.questionId, value });
  }

  return answers;
}

export function rangeHint(question: Question): string | null {
  if (question.type !== 'number') return null;
  if (question.min != null && question.max != null) return `${question.min} to ${question.max}`;
  if (question.min != null) return `at least ${question.min}`;
  if (question.max != null) return `at most ${question.max}`;
  return null;
}
