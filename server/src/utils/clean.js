/**
 * Helpers for loading and cleaning the supplied JSON data files.
 *
 * schools.json is real-world messy: the sample record has a double space in
 * "GOVT. PRIMARY SCHOOL,  AMBABHONA" and ~4,900 of the 53k names are padded
 * like that. Trimming has to happen on the way in, or search results and the
 * app's list look broken.
 */

/**
 * Normalise a string for storage.
 *
 * Two things happen here, both prompted by the supplied data:
 *  1. Leading/trailing whitespace is removed.
 *  2. Runs of internal whitespace collapse to a single space. The brief warns
 *     that real records "have extra spaces", and the very first sample record
 *     is "GOVT. PRIMARY SCHOOL,  AMBABHONA" with a double space that trim()
 *     alone leaves in place. Left alone it shows up on the list screen and
 *     makes duplicate-looking results.
 *
 * Anything that ends up empty becomes null rather than "".
 * Non-strings (numbers, booleans) are returned untouched.
 * @returns {string|null|any}
 */
export function cleanString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return value;
  const collapsed = value.replace(/\s+/g, ' ').trim();
  return collapsed === '' ? null : collapsed;
}

/** Apply cleanString to every value of an object. */
export function cleanObject(record) {
  const cleaned = {};
  for (const [key, value] of Object.entries(record)) {
    cleaned[key] = Array.isArray(value)
      ? value.map((item) => (typeof item === 'string' ? cleanString(item) : item))
      : cleanString(value);
  }
  return cleaned;
}

/** Read and parse a JSON file, with a helpful error if it is missing. */
export async function readJsonFile(filePath, label) {
  const { readFile } = await import('node:fs/promises');
  let raw;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        `Could not find ${label} at ${filePath}. ` +
          `Put the file there (the paths come from .env) and run the command again.`
      );
    }
    throw error;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label} at ${filePath} is not valid JSON: ${error.message}`);
  }
}
