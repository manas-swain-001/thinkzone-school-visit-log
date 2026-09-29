import Visit from '../models/Visit.js';
import School from '../models/School.js';
import User from '../models/User.js';
import Questionnaire from '../models/Questionnaire.js';
import { istYearMonth, isMoreThanMinutesAhead } from '../utils/ist.js';
import { unprocessable } from '../utils/ApiError.js';
import { validateAnswers } from './answerValidation.js';

/** The brief allows a visit to be at most this far in the future. */
export const FUTURE_TOLERANCE_MINUTES = 5;

/**
 * Save one visit, idempotently.
 *
 * The order of operations matters and is deliberate:
 *
 *  1. Return an existing visit for this clientId immediately. The app replays
 *     visits on every retry, so this has to be the first thing we try - a
 *     replay must never fail validation because time has moved on or the app
 *     has since been given different questions.
 *  2. Then validate everything else.
 *  3. Then insert, and if two identical requests raced each other, let the
 *     unique index on clientId reject the loser and return the winner.
 *
 * Step 1 on its own is not enough: two requests with the same clientId arriving
 * at the same moment both miss the lookup. The unique index is what makes the
 * second one fail, and catching E11000 is what turns that failure back into a
 * clean 200.
 *
 * @returns {Promise<{visit:object, created:boolean}>} created=false means it
 *          already existed and the caller should answer 200, not 201.
 */
export async function createVisit({ clientId, userId, udiseCode, visitedAt, answers }) {
  const existing = await Visit.findOne({ clientId }).lean();
  if (existing) {
    return { visit: existing, created: false };
  }

  const [school, user] = await Promise.all([
    School.findOne({ udiseCode }).lean(),
    User.findOne({ userId }).lean(),
  ]);

  if (!school) {
    throw unprocessable('SCHOOL_NOT_FOUND', `No school with udiseCode "${udiseCode}".`);
  }
  if (!user) {
    throw unprocessable('USER_NOT_FOUND', `"${userId}" is not one of the demo users.`);
  }

  if (isMoreThanMinutesAhead(visitedAt, FUTURE_TOLERANCE_MINUTES)) {
    throw unprocessable(
      'VISITED_AT_IN_FUTURE',
      'visitedAt cannot be more than 5 minutes in the future.'
    );
  }

  // The month comes from visitedAt in IST, never from the client. A visit made
  // at 23:50 IST on the last day of the month stays in that month even though
  // it is only synced the next morning.
  const { year, month } = istYearMonth(visitedAt);

  const questionnaire = await Questionnaire.findOne({ year, month }).lean();
  if (!questionnaire) {
    throw unprocessable(
      'QUESTIONNAIRE_NOT_AVAILABLE',
      `No questionnaire exists for ${year}-${String(month).padStart(2, '0')} (IST), so this visit cannot be saved.`
    );
  }

  const answerErrors = validateAnswers(answers, questionnaire);
  if (answerErrors.length > 0) {
    throw unprocessable(
      'INVALID_ANSWERS',
      'One or more answers are not valid for this visit.',
      answerErrors
    );
  }

  const document = {
    clientId,
    userId,
    udiseCode: school.udiseCode,
    // Denormalised from the school so listing visits and building the report
    // are both single-collection reads.
    schoolName: school.schoolName,
    districtCode: school.districtCode,
    blockCode: school.blockCode,
    clusterCode: school.clusterCode,
    visitedAt,
    year,
    month,
    answers,
  };

  try {
    const created = await Visit.create(document);
    return { visit: created.toObject(), created: true };
  } catch (error) {
    if (error?.code === 11000) {
      // Lost the race against a concurrent request with the same clientId.
      // The unique index did its job; the other request's document is the one
      // to return.
      const winner = await Visit.findOne({ clientId }).lean();
      return { visit: winner, created: false };
    }
    throw error;
  }
}

/** A user's visits, newest first, with optional year/month filters. */
export async function listVisits({ userId, year, month, skip, limit }) {
  const filter = { userId };
  if (year !== undefined) filter.year = year;
  if (month !== undefined) filter.month = month;

  const [total, visits] = await Promise.all([
    Visit.countDocuments(filter),
    Visit.find(filter)
      .sort({ visitedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return { visits, total };
}

export default { createVisit, listVisits };
