import { getApiBaseUrl } from '@/config/apiConfig';
import { ApiError, NetworkError, RequestAbortedError, type ErrorDetail } from './errors';

const DEFAULT_TIMEOUT_MS = 12_000;

type QueryValue = string | number | boolean | undefined | null;

export type ApiResult<T> = { data: T; status: number };

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
  timeoutMs?: number;
};

function buildUrl(path: string, query: Record<string, QueryValue> = {}): string {
  const search = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return `${getApiBaseUrl()}${path}${search ? `?${search}` : ''}`;
}

/**
 * The single place the app talks HTTP.
 *
 * Three outcomes are kept apart on purpose, because the sync engine treats
 * them differently: a 2xx body, an ApiError (the server refused - permanent if
 * 4xx) and a NetworkError (no answer at all - always worth retrying).
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const { method = 'GET', body, query, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const url = buildUrl(path, query);

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const forwardAbort = () => controller.abort();
  signal?.addEventListener('abort', forwardAbort);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    const payload = text ? safeParse(text) : null;

    if (!response.ok) {
      throw toApiError(response.status, payload);
    }

    return { data: payload as T, status: response.status };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (signal?.aborted) throw new RequestAbortedError();
    if (timedOut) throw new NetworkError('The server did not respond in time.');
    throw new NetworkError(describeTransportError(error));
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Unwraps the API's single error shape: { error: { code, message, details } }. */
function toApiError(status: number, payload: unknown): ApiError {
  const envelope =
    payload && typeof payload === 'object' && 'error' in payload
      ? (payload as { error: unknown }).error
      : null;

  if (envelope && typeof envelope === 'object') {
    const { code, message, details } = envelope as {
      code?: unknown;
      message?: unknown;
      details?: unknown;
    };
    return new ApiError(
      status,
      typeof code === 'string' ? code : 'HTTP_ERROR',
      typeof message === 'string' ? message : `Request failed (${status}).`,
      Array.isArray(details) ? (details as ErrorDetail[]) : []
    );
  }

  return new ApiError(status, 'HTTP_ERROR', `Request failed (${status}).`);
}

function describeTransportError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/failed to fetch|network request failed/i.test(message)) {
    return 'Cannot reach the server. Check the connection and the server address.';
  }
  return message;
}
