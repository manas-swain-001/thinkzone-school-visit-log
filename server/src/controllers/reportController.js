import { getBlockSummary } from '../services/reportService.js';

/** GET /api/reports/block-summary - coverage per block for a district+month. */
export async function blockSummary(req, res) {
  const summary = await getBlockSummary(req.valid.query);
  res.json(summary);
}

export default { blockSummary };
