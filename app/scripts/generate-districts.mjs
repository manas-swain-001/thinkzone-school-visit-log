/**
 * Generates src/data/districts.json: the district -> block list used to populate
 * the filter controls on the "Select school" screen.
 *
 *   npm run districts
 *
 * Why this file is bundled rather than fetched:
 *
 *   GET /api/schools only returns the four fields a list row needs
 *   (udiseCode, schoolName, clusterName, blockName). It has no endpoint that
 *   lists districts or blocks, so there is nothing to call to populate a filter
 *   dropdown. Options are therefore derived once, here, from the same
 *   schools.json the server imported, and shipped with the app so the filters
 *   work on a phone that has never had a network connection.
 *
 *   30 districts / 316 blocks out of 52,989 schools - about 20 KB, so this is
 *   cheap to bundle and saves the user from typing 4-6 digit codes.
 *
 * Real source data is messy, so names are trimmed and an empty name falls back
 * to the code, and the first spelling seen wins (the file's casing is all-caps
 * while the code list in the API is not).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = process.argv[2] ?? resolve(here, '../../server/data/schools.json');
const target = resolve(here, '../src/data/districts.json');

const raw = JSON.parse(await readFile(source, 'utf8'));
if (!Array.isArray(raw)) {
  throw new Error(`${source} must be a JSON array of schools`);
}

/** Trimmed, non-empty string, or null. Mirrors the server's clean step. */
function tidy(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

const districts = new Map();

for (const school of raw) {
  const districtCode = tidy(school.districtCode);
  const blockCode = tidy(school.blockCode);
  if (!districtCode || !blockCode) continue;

  let district = districts.get(districtCode);
  if (!district) {
    district = {
      districtCode,
      districtName: tidy(school.districtName) ?? districtCode,
      blocks: new Map(),
    };
    districts.set(districtCode, district);
  }

  if (!district.blocks.has(blockCode)) {
    district.blocks.set(blockCode, {
      blockCode,
      blockName: tidy(school.blockName) ?? blockCode,
    });
  }
}

const output = [...districts.values()]
  .sort((a, b) => a.districtCode.localeCompare(b.districtCode))
  .map((district) => ({
    districtCode: district.districtCode,
    districtName: district.districtName,
    blocks: [...district.blocks.values()].sort((a, b) =>
      a.blockCode.localeCompare(b.blockCode)
    ),
  }));

await writeFile(target, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

const blockCount = output.reduce((sum, district) => sum + district.blocks.length, 0);
console.log(
  `wrote ${output.length} districts / ${blockCount} blocks to ${target} (from ${raw.length} schools)`
);
