import School from '../models/School.js';

/** Escape a user-supplied string before it goes anywhere near $regex. */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Search and page through schools.
 *
 * `search` is "part of the school name (ignoring case) OR the start of the
 * udiseCode", which is a substring test and so cannot be served by a normal
 * b-tree index. That is a deliberate trade-off rather than an oversight: a
 * leading-wildcard regex is unservable by an index anyway, the whole
 * collection is ~53k documents, and Mongo still does the filtering rather
 * than Node counting rows. If the data grew, the fix would be a search
 * service, not a different index on this collection.
 */
export async function listSchools({
  districtCode,
  blockCode,
  clusterCode,
  search,
  skip,
  limit,
}) {
  const filter = {};

  if (districtCode) filter.districtCode = districtCode;
  if (blockCode) filter.blockCode = blockCode;
  if (clusterCode) filter.clusterCode = clusterCode;

  if (search) {
    const safe = escapeRegExp(search);
    filter.$or = [
      { schoolName: { $regex: safe, $options: 'i' } },
      { udiseCode: { $regex: `^${safe}`, $options: 'i' } },
    ];
  }

  // Only the fields a list screen needs, per the brief.
  const projection = {
    udiseCode: 1,
    schoolName: 1,
    clusterName: 1,
    blockName: 1,
  };

  const [total, schools] = await Promise.all([
    School.countDocuments(filter),
    School.find(filter)
      .select(projection)
      .sort({ schoolName: 1, udiseCode: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return { schools, total };
}

/** Look up one school by udiseCode, or null. Used when saving a visit. */
export async function findSchoolByUdise(udise) {
  return School.findOne({ udiseCode: udise }).lean();
}

export default { listSchools, findSchoolByUdise };
