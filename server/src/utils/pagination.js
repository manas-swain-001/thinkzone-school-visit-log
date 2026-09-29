import { badRequest } from './ApiError.js';

/**
 * Shared page/limit handling.
 *
 * The brief says /api/visits "is paginated in the same way as /api/schools",
 * so both go through this one function rather than duplicating the rules.
 *
 * Query values arrive as strings, so "abc" and "-3" have to be rejected here
 * rather than being coerced into something surprising downstream.
 */
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

function toPositiveInteger(value, fallback, field) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw badRequest(`"${field}" must be a whole number of 1 or more.`, [
      { field, message: `Received "${value}".` },
    ]);
  }
  return parsed;
}

/**
 * @param {object} query req.query
 * @returns {{page:number, limit:number, skip:number}}
 */
export function parsePagination(query = {}) {
  const page = toPositiveInteger(query.page, 1, 'page');
  const requestedLimit = toPositiveInteger(query.limit, DEFAULT_LIMIT, 'limit');

  if (requestedLimit > MAX_LIMIT) {
    throw badRequest(`"limit" must be ${MAX_LIMIT} or less.`, [
      { field: 'limit', message: `Received ${requestedLimit}.` },
    ]);
  }

  return { page, limit: requestedLimit, skip: (page - 1) * requestedLimit };
}

/** Attach the page/limit/total envelope the brief asks both list endpoints to return. */
export function pageEnvelope({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}
