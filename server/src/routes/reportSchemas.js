import Joi from 'joi';
import * as v from '../utils/validators.js';

/**
 * Query shape for GET /api/reports/block-summary.
 *
 * All three are required: the report is "block coverage for a district in a
 * month", and with the district missing it would aggregate the whole country.
 * The app always knows all three (the district comes from the visited school,
 * the month from the server), so nothing legitimate is lost.
 */
export const blockSummaryQuery = Joi.object({
  districtCode: v.code.required(),
  month: v.month.required(),
  year: v.year.required(),
});
