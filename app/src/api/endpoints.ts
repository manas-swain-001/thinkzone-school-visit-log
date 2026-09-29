import { apiFetch } from './client';
import type {
  Answer,
  BlockSummary,
  HealthStatus,
  Paged,
  Questionnaire,
  ServerVisit,
  SchoolRow,
} from './types';

const PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export type SchoolQuery = {
  districtCode?: string | null;
  blockCode?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
};

export async function listSchools(query: SchoolQuery = {}): Promise<Paged<SchoolRow>> {
  const { data } = await apiFetch<Paged<SchoolRow>>('/api/schools', {
    query: {
      districtCode: query.districtCode ?? undefined,
      blockCode: query.blockCode ?? undefined,
      search: query.search?.trim() || undefined,
      page: query.page ?? 1,
      limit: query.limit ?? PAGE_SIZE,
    },
    signal: query.signal,
  });
  return data;
}

/**
 * The current month's questions. The month is decided by the server's clock,
 * never by the app - there is deliberately no way to ask for a different one.
 */
export async function fetchCurrentQuestionnaire(signal?: AbortSignal): Promise<Questionnaire> {
  const { data } = await apiFetch<{ data: Questionnaire }>('/api/questionnaires/current', {
    signal,
  });
  return data.data;
}

export type CreateVisitInput = {
  clientId: string;
  userId: string;
  udiseCode: string;
  visitedAt: string;
  answers: Answer[];
};

export type CreateVisitResult = { visit: ServerVisit; created: boolean };

/** 201 for a new visit, 200 when the clientId had already been stored. */
export async function createVisit(
  input: CreateVisitInput,
  signal?: AbortSignal
): Promise<CreateVisitResult> {
  const { data, status } = await apiFetch<{ data: ServerVisit }>('/api/visits', {
    method: 'POST',
    body: input,
    signal,
  });
  return { visit: data.data, created: status === 201 };
}

export type VisitQuery = {
  userId: string;
  year?: number;
  month?: number;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
};

export async function listVisits(query: VisitQuery): Promise<Paged<ServerVisit>> {
  const { data } = await apiFetch<Paged<ServerVisit>>('/api/visits', {
    query: {
      userId: query.userId,
      year: query.year,
      month: query.month,
      page: query.page ?? 1,
      limit: query.limit ?? PAGE_SIZE,
    },
    signal: query.signal,
  });
  return data;
}

export async function fetchBlockSummary(
  params: { districtCode: string; year: number; month: number },
  signal?: AbortSignal
): Promise<BlockSummary> {
  const { data } = await apiFetch<BlockSummary>('/api/reports/block-summary', {
    query: params,
    signal,
  });
  return data;
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthStatus> {
  const { data } = await apiFetch<HealthStatus>('/api/health', { signal, timeoutMs: 6000 });
  return data;
}

export const SCHOOL_PAGE_SIZE = PAGE_SIZE;
export const VISIT_PAGE_SIZE = PAGE_SIZE;
export { MAX_PAGE_SIZE };
