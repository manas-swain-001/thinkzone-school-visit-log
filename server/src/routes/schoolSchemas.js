import Joi from 'joi';
import * as v from '../utils/validators.js';

/** Query shape for GET /api/schools. */
export const listSchoolsQuery = Joi.object({
  districtCode: v.code.optional(),
  blockCode: v.code.optional(),
  clusterCode: v.code.optional(),
  search: v.searchTerm.optional(),
  page: v.page.optional(),
  limit: v.limit.optional(),
});
