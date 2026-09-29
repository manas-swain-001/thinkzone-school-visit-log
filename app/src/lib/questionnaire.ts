import { fetchCurrentQuestionnaire } from '@/api/endpoints';
import { isAbortError } from '@/api/errors';
import type { Questionnaire } from '@/api/types';
import { readJson, writeJson, StorageKeys } from '@/storage/kv';
import { isEarlierMonth, istYearMonth, monthLabel, type YearMonth } from './ist';

export type QuestionnaireResolution =
  | { status: 'ready'; questionnaire: Questionnaire; source: 'network' | 'cache' }
  /** The device holds last month's questions: the user has to come back online. */
  | { status: 'stale'; cached: Questionnaire | null }
  | { status: 'unavailable'; message: string };

/**
 * Which questionnaire the visit form may show.
 *
 * The server decides what "this month" means from its own clock, so the app
 * asks for the current one and caches it. The only judgement made on the
 * device is a staleness check: if the cache is from an earlier IST month than
 * the phone's, the questions are last month's, their ids will be rejected with
 * a 422 when the visit syncs, and showing them would waste the field officer's
 * time - so the form refuses and asks for a connection instead.
 */
export async function resolveQuestionnaire(options: {
  isOnline: boolean;
  /** Skip the network and use whatever is cached. */
  offlineOnly?: boolean;
}): Promise<QuestionnaireResolution> {
  const cached = await readCachedQuestionnaire();
  const now = istYearMonth();

  if (!options.offlineOnly) {
    if (options.isOnline) {
      try {
        const questionnaire = await fetchCurrentQuestionnaire();
        await writeJson(StorageKeys.questionnaire, questionnaire);
        return { status: 'ready', questionnaire, source: 'network' };
      } catch (error) {
        if (isAbortError(error)) throw error;
        // Online but unreachable (wrong server address, laptop asleep): fall
        // back to the cache and let the staleness rules below decide.
        console.warn('[questionnaire] refresh failed, falling back to cache', error);
      }
    }
  }

  if (!cached) {
    return {
      status: 'unavailable',
      message:
        'This month’s questions have not been downloaded yet. Connect to the internet once to fetch them, then the visit form will work offline.',
    };
  }

  if (isEarlierMonth(cached, now)) {
    return { status: 'stale', cached };
  }

  return { status: 'ready', questionnaire: cached, source: 'cache' };
}

export async function readCachedQuestionnaire(): Promise<Questionnaire | null> {
  const cached = await readJson<Questionnaire | null>(StorageKeys.questionnaire, null);
  if (!cached || typeof cached.year !== 'number' || !Array.isArray(cached.questions)) {
    return null;
  }
  return cached;
}

export function describeStaleQuestionnaire(cached: Questionnaire | null, now: YearMonth): string {
  const had = cached ? `The questions on this phone are from ${monthLabel(cached)}.` : '';
  return (
    `${had} It is now ${monthLabel(now)} in India, and this month’s questions have not been ` +
    'downloaded. Connect to the internet to get the current questionnaire, then fill in the visit.'
  );
}
