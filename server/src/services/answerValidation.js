/**
 * Validates a visit's answers against the questionnaire for the month the
 * visit belongs to.
 *
 * This cannot be a Joi schema, because the rules are only known once the
 * month's questionnaire has been read out of the database. It is a pure
 * function on purpose: no Mongoose, no I/O, so it can be unit tested
 * directly.
 *
 * @param {Array<{questionId:string, value:any}>} answers
 * @param {{title:string, year:number, month:number, questions:Array}} questionnaire
 * @returns {Array<{field:string, message:string}>} empty array when valid
 */
export function validateAnswers(answers, questionnaire) {
  const errors = [];
  const byId = new Map(questionnaire.questions.map((question) => [question.questionId, question]));
  const answered = new Set();

  for (const answer of answers) {
    const field = `answers.${answer.questionId}`;

    if (answered.has(answer.questionId)) {
      errors.push({ field, message: `"${answer.questionId}" was answered more than once.` });
      continue;
    }
    answered.add(answer.questionId);

    const question = byId.get(answer.questionId);

    if (!question) {
      // The case the brief calls out: the app was offline with last month's
      // questions cached, or the visit is from a month that has since rolled.
      errors.push({
        field,
        message:
          `"${answer.questionId}" is not a question in the ${questionnaire.title} questionnaire. ` +
          `The app may still be holding questions from an earlier month.`,
      });
      continue;
    }

    if (!isValidValue(answer.value, question)) {
      errors.push({ field, message: describeMismatch(answer.value, question) });
    }
  }

  // Every question without "optional": true must be answered. The message
  // carries the questionId as well as the text, so the app can map the error
  // back to the right input without having to look the id up itself.
  for (const question of questionnaire.questions) {
    if (!question.optional && !answered.has(question.questionId)) {
      errors.push({
        field: `answers.${question.questionId}`,
        message: `"${question.questionId}" is required: "${question.text}".`,
      });
    }
  }

  return errors;
}

function isValidValue(value, question) {
  switch (question.type) {
    case 'yesNo':
      return typeof value === 'boolean';

    case 'number': {
      // "A whole number from min to max" - so no decimals, and the bounds
      // from the questionnaire are enforced.
      if (typeof value !== 'number' || !Number.isInteger(value)) return false;
      if (question.min !== null && question.min !== undefined && value < question.min) return false;
      if (question.max !== null && question.max !== undefined && value > question.max) return false;
      return true;
    }

    case 'singleChoice':
      return typeof value === 'string' && (question.options ?? []).includes(value);

    case 'text':
      if (typeof value !== 'string') return false;
      if (question.maxLength !== null && question.maxLength !== undefined) {
        return value.length <= question.maxLength;
      }
      return true;

    default:
      return false;
  }
}

/** Turns a rejected value into a message that says what was wrong with it. */
function describeMismatch(value, question) {
  const actual = Array.isArray(value) ? 'an array' : JSON.stringify(value);

  switch (question.type) {
    case 'yesNo':
      return `"${question.text}" expects true or false but received ${actual}.`;

    case 'number': {
      const range =
        question.min !== null && question.min !== undefined && question.max !== null && question.max !== undefined
          ? `a whole number between ${question.min} and ${question.max}`
          : 'a whole number';
      return `"${question.text}" expects ${range} but received ${actual}.`;
    }

    case 'singleChoice':
      return `"${question.text}" expects one of ${(question.options ?? []).join(', ')} but received ${actual}.`;

    case 'text': {
      const limit =
        question.maxLength !== null && question.maxLength !== undefined
          ? ` of at most ${question.maxLength} characters`
          : '';
      return `"${question.text}" expects a string${limit} but received ${actual}.`;
    }

    default:
      return `"${question.questionId}" has an unsupported type "${question.type}".`;
  }
}

export default validateAnswers;
