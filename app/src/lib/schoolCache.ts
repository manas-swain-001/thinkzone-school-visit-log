import type { SchoolRow } from '@/api/types';
import { readJson, writeJson, StorageKeys } from '@/storage/kv';

/**
 * Schools the user has already loaded are kept on the device so the list still
 * works with no network. The brief scopes this to "the schools the user has
 * already loaded" - searching for a school never seen online is the one thing
 * that still needs a connection, and the screen says so when it happens.
 */
const MAX_CACHED_SCHOOLS = 3000;

export async function cacheSchools(rows: SchoolRow[]): Promise<void> {
  if (rows.length === 0) return;

  const existing = await readCachedSchools();
  const byUdise = new Map(existing.map((school) => [school.udiseCode, school]));

  for (const school of rows) byUdise.set(school.udiseCode, school);

  const merged = [...byUdise.values()].slice(-MAX_CACHED_SCHOOLS);
  await writeJson(StorageKeys.schools, merged);
}

export async function readCachedSchools(): Promise<SchoolRow[]> {
  const cached = await readJson<SchoolRow[]>(StorageKeys.schools, []);
  return Array.isArray(cached) ? cached : [];
}

/** Case-insensitive match on the same two fields the API searches. */
export function filterCachedSchools(
  schools: SchoolRow[],
  options: { search?: string | null; blockName?: string | null }
): SchoolRow[] {
  const search = options.search?.trim().toLowerCase() ?? '';
  const blockName = options.blockName?.toLowerCase() ?? null;

  return schools.filter((school) => {
    if (blockName && (school.blockName ?? '').toLowerCase() !== blockName) return false;
    if (!search) return true;
    return (
      school.schoolName.toLowerCase().includes(search) ||
      school.udiseCode.toLowerCase().startsWith(search)
    );
  });
}
