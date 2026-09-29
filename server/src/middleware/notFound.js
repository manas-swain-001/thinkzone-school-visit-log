import { ApiError } from '../utils/ApiError.js';

/** Catch-all for a request that matched no route. */
export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', `No route matches ${req.method} ${req.originalUrl}`));
}

export default notFoundHandler;
