import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

dotenv.config({ path: path.join(serverRoot, '.env') });

function required(name) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy .env.example to .env and fill it in.`
    );
  }
  return value;
}

function optional(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

/** Data-file paths are resolved from the server root, not the cwd, so the
 *  scripts behave the same no matter where npm is invoked from. */
function resolveDataPath(value) {
  return path.isAbsolute(value) ? value : path.join(serverRoot, value);
}

export const config = {
  env: optional('NODE_ENV', 'development'),
  port: Number(optional('PORT', 3000)),
  host: optional('HOST', '0.0.0.0'),
  mongoUri: required('MONGODB_URI'),
  schoolsFile: resolveDataPath(optional('SCHOOLS_FILE', 'data/schools.json')),
  questionnairesFile: resolveDataPath(optional('QUESTIONNAIRES_FILE', 'data/questionnaires.json')),
  serverRoot,
};

export default config;
