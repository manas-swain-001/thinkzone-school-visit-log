import Questionnaire from '../models/Questionnaire.js';
import { currentIstYearMonth } from '../utils/ist.js';
import { notFound } from '../utils/ApiError.js';

/**
 * The questionnaire for the current IST month, worked out from the server's
 * clock. There is no date arithmetic in the query itself - the month is
 * resolved to plain { year, month } numbers first and then matched exactly.
 */
export async function getCurrentQuestionnaire(now = new Date()) {
  const { year, month } = currentIstYearMonth(now);
  return Questionnaire.findOne({ year, month }).lean();
}

/** Same, but turns a missing month into the 404 the brief asks for. */
export async function getCurrentQuestionnaireOrThrow(now = new Date()) {
  const { year, month } = currentIstYearMonth(now);
  const questionnaire = await Questionnaire.findOne({ year, month }).lean();

  if (!questionnaire) {
    throw notFound(
      'QUESTIONNAIRE_NOT_FOUND',
      `No questionnaire has been published for the current month (${year}-${String(month).padStart(2, '0')}).`
    );
  }

  return questionnaire;
}
