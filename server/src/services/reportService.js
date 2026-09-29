import School from '../models/School.js';
import Visit from '../models/Visit.js';
import { unprocessable } from '../utils/ApiError.js';

/**
 * Block-level coverage for one district in one month.
 *
 * Everything is counted inside MongoDB. The pipeline is built to never hand
 * documents back to Node, because the brief asks for exactly that and because
 * 53k schools x N visits would otherwise be a slow round trip.
 *
 * The shape of the answer:
 *   blocks[]        one row per block in the district, including blocks with
 *                   no visits at all, which come out as zeros
 *   districtTotal   the same measures for the district as a whole
 *
 * Two ideas do all the work:
 *
 *  1. The pipeline starts from `schools`, not from `visits`. Starting from
 *     visits would silently drop unvisited blocks, and the brief requires them
 *     to appear with zeros. Starting from schools also means totalSchools is a
 *     simple $sum, and the "no visits" case falls out as an empty aggregation
 *     result rather than a special case.
 *
 *  2. Counting "distinct" things uses $addToSet followed by $size. $addToSet
 *     dedupes, so the array length is the distinct count. That is how one user
 *     visiting the same school twice still counts once, and how a (user,
 *     school) pair is made unique by concatenating the two into one string.
 */
export async function getBlockSummary({ districtCode, year, month }) {
  const districtExists = await School.exists({ districtCode });
  if (!districtExists) {
    throw unprocessable('DISTRICT_NOT_FOUND', `No schools found for district "${districtCode}".`);
  }

  /** The distinct counts for one set of visit documents. */
  const distinctCounts = {
    schoolsVisitedSet: { $addToSet: '$udiseCode' },
    visitorsSet: { $addToSet: '$userId' },
    // A (user, school) pair as a single string is the cheapest way to make the
    // pair itself the thing that gets deduped. Codes are alphanumeric, so '|'
    // can never appear inside one and split a pair in two.
    pairsSet: { $addToSet: { $concat: ['$userId', '|', '$udiseCode'] } },
  };

  /**
   * $size of an $addToSet array is the distinct count, and $ifNull turns a
   * block with no visits into zeros rather than a missing field. Kept as
   * expressions (not a $let variable) so they can be used directly as
   * $project field values.
   */
  const summariseFields = {
    schoolsVisited: { $size: { $ifNull: ['$agg.schoolsVisitedSet', []] } },
    uniqueVisitors: { $size: { $ifNull: ['$agg.visitorsSet', []] } },
    visits: { $size: { $ifNull: ['$agg.pairsSet', []] } },
  };

  /** totalSchools is always >= 1 here, so the division is safe. */
  const coverage = {
    coveragePercent: {
      $round: [{ $multiply: [{ $divide: ['$schoolsVisited', '$totalSchools'] }, 100] }, 1],
    },
  };

  const pipeline = [
    { $match: { districtCode } },

    {
      $facet: {
        // ---- one row per block -------------------------------------------
        blocks: [
          { $group: { _id: '$blockCode', blockName: { $first: '$blockName' }, totalSchools: { $sum: 1 } } },
          { $sort: { blockName: 1, _id: 1 } },
          {
            $lookup: {
              from: 'visits',
              let: { blockCode: '$_id' },
              pipeline: [
                // year/month are plain equality so the report_scope index can
                // bound the scan; only the correlated blockCode needs $expr.
                { $match: { year, month, $expr: { $eq: ['$blockCode', '$$blockCode'] } } },
                { $group: { _id: null, ...distinctCounts } },
              ],
              as: 'blockVisits',
            },
          },
          // A block with no visits produces no documents from the $group
          // inside the $lookup, so blockVisits is [] - $ifNull turns that
          // into an empty object and the counts below become zeros.
          { $addFields: { agg: { $ifNull: [{ $arrayElemAt: ['$blockVisits', 0] }, {}] } } },
          {
            $project: {
              _id: 0,
              blockCode: '$_id',
              blockName: 1,
              totalSchools: 1,
              ...summariseFields,
            },
          },
          { $addFields: coverage },
          { $unset: ['agg', 'blockVisits'] },
        ],

        // ---- the district as a whole --------------------------------------
        districtTotal: [
          { $group: { _id: null, totalSchools: { $sum: 1 } } },
          {
            $lookup: {
              from: 'visits',
              pipeline: [
                { $match: { year, month, districtCode } },
                { $group: { _id: null, ...distinctCounts } },
              ],
              as: 'districtVisits',
            },
          },
          { $addFields: { agg: { $ifNull: [{ $arrayElemAt: ['$districtVisits', 0] }, {}] } } },
          {
            $project: {
              _id: 0,
              totalSchools: 1,
              ...summariseFields,
            },
          },
          { $addFields: coverage },
          { $unset: ['agg', 'districtVisits'] },
        ],
      },
    },
  ];

  const [result] = await School.aggregate(pipeline).exec();

  // An empty $facet result means the district matched nothing (guarded above,
  // but a concurrent delete should not produce a confusing crash).
  const blocks = (result?.blocks ?? []).map((row) => ({
    blockCode: row.blockCode,
    blockName: row.blockName,
    totalSchools: row.totalSchools,
    schoolsVisited: row.schoolsVisited ?? 0,
    uniqueVisitors: row.uniqueVisitors ?? 0,
    visits: row.visits ?? 0,
    coveragePercent: row.coveragePercent ?? 0,
  }));

  const rawTotal = result?.districtTotal?.[0];
  const districtTotal = {
    totalSchools: rawTotal?.totalSchools ?? 0,
    schoolsVisited: rawTotal?.schoolsVisited ?? 0,
    uniqueVisitors: rawTotal?.uniqueVisitors ?? 0,
    visits: rawTotal?.visits ?? 0,
    coveragePercent: rawTotal?.coveragePercent ?? 0,
  };

  return { districtCode, year, month, blocks, districtTotal };
}

export default { getBlockSummary };
