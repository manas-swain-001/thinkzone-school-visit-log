import { badRequest } from '../utils/ApiError.js';

/**
 * Validates one part of a request against a Joi schema and stores the
 * *coerced* result on `req.valid`.
 *
 * Validated output is kept separately rather than overwriting req.query /
 * req.body, because Express 5 makes req.query a read-only getter and because
 * seeing `req.valid.query` in a controller makes it obvious the values have
 * already been checked and normalised.
 *
 * @param {object} schema Joi schema
 * @param {'query'|'body'|'params'} source
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false, // report every problem at once, not just the first
      convert: true, // "5" -> 5
      stripUnknown: true, // ignore extra fields instead of failing on them
    });

    if (error) {
      const details = error.details.map((item) => ({
        field: item.path.join('.') || source,
        message: item.message,
      }));
      const first = details[0]?.message ?? 'The request was not valid.';
      return next(badRequest(first, details));
    }

    if (!req.valid) req.valid = {};
    req.valid[source] = value;
    return next();
  };
}

export default validate;
