import * as visitService from '../services/visitService.js';
import { parsePagination, pageEnvelope } from '../utils/pagination.js';

/** POST /api/visits - save one visit. 201 when new, 200 when it already exists. */
export async function createVisit(req, res) {
  const { visit, created } = await visitService.createVisit(req.valid.body);
  res.status(created ? 201 : 200).json({ data: visit });
}

/** GET /api/visits - a user's visits, newest first. */
export async function listVisits(req, res) {
  const { page, limit, skip } = parsePagination(req.valid.query);

  const { visits, total } = await visitService.listVisits({
    ...req.valid.query,
    skip,
    limit,
  });

  res.json({
    data: visits,
    ...pageEnvelope({ page, limit, total }),
  });
}

export default { createVisit, listVisits };
