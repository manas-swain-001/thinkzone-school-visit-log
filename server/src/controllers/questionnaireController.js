import { getCurrentQuestionnaireOrThrow } from '../services/questionnaireService.js';

/**
 * GET /api/questionnaires/current
 *
 * The app always shows the current month's questions, so the month is derived
 * on the server and never accepted from the client. Returns 404 when that
 * month has no questionnaire published.
 */
export async function getCurrentQuestionnaire(_req, res) {
  const questionnaire = await getCurrentQuestionnaireOrThrow();
  res.json({ data: questionnaire });
}

export default { getCurrentQuestionnaire };
