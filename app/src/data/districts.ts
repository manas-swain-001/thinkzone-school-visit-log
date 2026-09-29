import raw from './districts.json';

export type BlockEntry = { blockCode: string; blockName: string };
export type DistrictEntry = { districtCode: string; districtName: string; blocks: BlockEntry[] };

/**
 * The district -> block list, generated from schools.json by
 * `npm run districts` (see scripts/generate-districts.mjs). It exists because
 * GET /api/schools only returns the four fields a list row needs and there is
 * no endpoint listing districts, so the filters would otherwise have nothing
 * to populate themselves from - and nothing at all to work from offline.
 */
export const districts = raw as DistrictEntry[];

export function districtName(districtCode: string | null | undefined): string | null {
  if (!districtCode) return null;
  return districts.find((entry) => entry.districtCode === districtCode)?.districtName ?? null;
}

export function blocksFor(districtCode: string | null | undefined): BlockEntry[] {
  if (!districtCode) return [];
  return districts.find((entry) => entry.districtCode === districtCode)?.blocks ?? [];
}

export function blockName(blockCode: string | null | undefined): string | null {
  if (!blockCode) return null;
  for (const district of districts) {
    const match = district.blocks.find((block) => block.blockCode === blockCode);
    if (match) return match.blockName;
  }
  return null;
}
