import Joi from 'joi';
import * as v from '../utils/validators.js';

/**
 * Body shape for POST /api/visits.
 *
 * Only the *envelope* is checked here. The answers themselves are validated in
 * answerValidation.js, because their rules live inside the month's
 * questionnaire document rather than in a static schema.
 */
export const createVisitBody = Joi.object({
  clientId: Joi.string().trim().uuid({ version: ['uuidv4'] }).required(),
  userId: v.userId.required(),
  udiseCode: v.udiseCode.required(),
  visitedAt: Joi.date().iso().required(),
  answers: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.string().trim().min(1).max(40).required(),
        // Deliberately untyped here; the questionnaire decides what is legal.
        value: Joi.any().required(),
      })
    )
    .min(1)
    .required(),
});

/** Query shape for GET /api/visits. */
export const listVisitsQuery = Joi.object({
  userId: v.userId.required(),
  year: v.year.optional(),
  month: v.month.optional(),
  page: v.page.optional(),
  limit: v.limit.optional(),
});
