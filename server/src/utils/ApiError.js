/**
 * An error that is safe to show the client.
 *
 * Every failure leaving this API is one of these, so the response body is
 * always the same shape:
 *
 *   { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
 *
 * Anything that is NOT an ApiError is treated as a bug by the error handler,
 * logged in full, and reported to the client as a generic 500 so internals
 * never leak.
 */
export class ApiError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} code   stable machine-readable code, e.g. 'NOT_FOUND'
   * @param {string} message human-readable explanation
   * @param {object} [options]
   * @param {Array<{field:string, message:string}>} [options.details]
   */
  constructor(status, code, message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = options.details;
    this.expected = true;
    Error.captureStackTrace?.(this, ApiError);
  }

  toJSON() {
    const body = { error: { code: this.code, message: this.message } };
    if (this.details && this.details.length > 0) {
      body.error.details = this.details;
    }
    return body;
  }
}

/* ---- Factories for the failures this API actually has ---- */

/** 400 - the request itself is malformed (bad query string, wrong JSON types). */
export const badRequest = (message, details) =>
  new ApiError(400, 'VALIDATION_ERROR', message, { details });

/**
 * 422 - the request is well formed but cannot be processed: an unknown school,
 * an unknown user, a stale month, a bad answer. Kept distinct from 400 so the
 * app can tell "you sent nonsense" from "we understood you and refused".
 */
export const unprocessable = (code, message, details) =>
  new ApiError(422, code, message, { details });

export const notFound = (code, message) => new ApiError(404, code, message);
