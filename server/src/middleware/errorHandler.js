import { ApiError } from '../utils/ApiError.js';

/**
 * The single place an error becomes an HTTP response, so every failure has
 * the same shape.
 *
 * Anything that reaches here that is NOT an ApiError is treated as a bug: it is
 * logged with its stack and reported to the client as a bare 500, so internal
 * details (mongo URIs, query text) can never leak out.
 */
export function errorHandler(error, _req, res, _next) {
  // 1. Deliberate, client-facing failures.
  if (error instanceof ApiError) {
    return res.status(error.status).json(error.toJSON());
  }

  // 2. A duplicate key that escaped the service layer. POST /api/visits turns
  //    its own duplicate-key race into a 200 with the existing visit, so
  //    reaching here means the race was not handled where it should have been.
  if (error?.code === 11000) {
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_KEY',
        message: 'That record already exists.',
      },
    });
  }

  // 3. A Mongoose schema violation, e.g. a required field the service forgot.
  if (error?.name === 'ValidationError' && error.errors) {
    const details = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: details[0]?.message ?? 'Invalid value.', details },
    });
  }

  // 4. A value that could not be cast, e.g. udiseCode: 'abc' where an ObjectId
  //    was expected somewhere upstream.
  if (error?.name === 'CastError') {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: `Invalid value for "${error.path}".` },
    });
  }

  // 5. A Joi error thrown outside the validate() middleware.
  if (error?.isJoi) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: error.details?.[0]?.message ?? 'Invalid value.' },
    });
  }

  // 6. Genuinely unexpected.
  console.error('[unhandled error]', error);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side.' },
  });
}

export default errorHandler;
