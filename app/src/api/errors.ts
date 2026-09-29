import type { AnswerValue } from './types';

export type ErrorDetail = { field: string; message: string };

/**
 * A response the server understood and refused: it carries a status and the
 * API's own error code. Anything in the 4xx range is permanent, so the sync
 * engine stops retrying and the visit is marked Failed.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ErrorDetail[];

  constructor(status: number, code: string, message: string, details: ErrorDetail[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** First per-answer message, which is usually the most useful one to show. */
  get primaryDetail(): string | null {
    return this.details[0]?.message ?? null;
  }
}

/**
 * The request never produced an answer: DNS, a dropped connection, a timeout,
 * airplane mode. Transient by nature, so the visit stays Pending.
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

/** The caller aborted (screen unmounted, query changed). Not a failure to sync. */
export class RequestAbortedError extends Error {
  constructor(message = 'Request aborted') {
    super(message);
    this.name = 'AbortError';
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof RequestAbortedError;
}

/**
 * Whether a visit should keep being retried.
 *
 * True for network trouble and 5xx; false for 4xx, which the brief defines as
 * a permanent rejection (a bad answer, an unknown school, a stale month).
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof RequestAbortedError) return false;
  if (error instanceof ApiError) return error.status >= 500;
  return true;
}

/** A short line for the visit list: the answer-level reason where there is one. */
export function describeError(error: unknown): { code: string; message: string; details: ErrorDetail[] } {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      message: error.primaryDetail ?? error.message,
      details: error.details,
    };
  }
  if (error instanceof NetworkError) {
    return { code: 'NETWORK_ERROR', message: error.message, details: [] };
  }
  return { code: 'UNEXPECTED_ERROR', message: 'Something went wrong.', details: [] };
}

export function stringifyAnswerValue(value: AnswerValue): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
