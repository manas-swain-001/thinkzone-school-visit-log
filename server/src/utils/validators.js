import Joi from 'joi';

/**
 * Joi building blocks reused across the routes, so "what is a valid district
 * code" is answered in exactly one place.
 */

/**
 * Codes in the data (district, block, cluster, udise) are alphanumeric
 * strings. Allowing only letters and digits means a code can never smuggle
 * anything into a query.
 */
export const code = Joi.string().trim().min(1).max(24).pattern(/^[A-Za-z0-9]+$/).messages({
  'string.pattern.base': 'must contain only letters and numbers',
});

export const udiseCode = Joi.string().trim().min(1).max(24).pattern(/^[A-Za-z0-9]+$/);

export const userId = Joi.string().trim().min(1).max(24);

export const year = Joi.number().integer().min(2000).max(2100);

export const month = Joi.number().integer().min(1).max(12);

export const page = Joi.number().integer().min(1);

export const limit = Joi.number().integer().min(1).max(100);

/** Free-text search box. */
export const searchTerm = Joi.string().trim().min(1).max(100);
