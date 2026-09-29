import * as schoolService from '../services/schoolService.js';
import { parsePagination, pageEnvelope } from '../utils/pagination.js';

/** GET /api/schools - search and page through schools. */
export async function listSchools(req, res) {
  const { page, limit, skip } = parsePagination(req.valid.query);

  const { schools, total } = await schoolService.listSchools({
    ...req.valid.query,
    skip,
    limit,
  });

  res.json({
    data: schools,
    ...pageEnvelope({ page, limit, total }),
  });
}

export default { listSchools };
