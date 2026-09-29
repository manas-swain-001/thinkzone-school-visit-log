/**
 * Imports schools.json into the `schools` collection.
 *
 *   npm run import:schools
 *
 * Notes on the decisions here:
 *  - The supplied file uses a few different field names and carries an `_id`
 *    as Extended JSON. `_id` is dropped on purpose: Mongo generates it, and
 *    reusing a source `_id` would make the upsert below fail on the
 *    "immutable field" rule the moment a school is updated.
 *  - `school_type` in the file becomes `schoolType` in the model.
 *  - `slNo` and `isNv` are not part of the documented school record, so they
 *    are not stored. Nothing downstream reads them.
 *  - Re-running is safe: every write is an upsert keyed on udiseCode, which is
 *    also backed by a unique index.
 */
import mongoose from 'mongoose';
import config from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import School from '../models/School.js';
import { cleanString, readJsonFile } from '../utils/clean.js';

const CHUNK_SIZE = 1000;

/** Fields that must be present for a school to be usable at all. */
const REQUIRED_FIELDS = ['districtCode', 'blockCode', 'clusterCode', 'udiseCode', 'schoolName'];

/** Map the JSON file's field names onto the model and clean every string. */
function toSchoolDocument(record) {
  return {
    districtCode: cleanString(record.districtCode),
    districtName: cleanString(record.districtName),
    blockCode: cleanString(record.blockCode),
    blockName: cleanString(record.blockName),
    clusterCode: cleanString(record.clusterCode),
    clusterName: cleanString(record.clusterName),
    udiseCode: cleanString(record.udiseCode),
    schoolName: cleanString(record.schoolName),
    schoolType: cleanString(record.school_type),
    management: cleanString(record.management),
    category: cleanString(record.category),
    classFrom: cleanString(record.classFrom),
    classTo: cleanString(record.classTo),
    address: cleanString(record.address),
  };
}

/** @returns {null|{reason:string}} null when the record is usable. */
function findSkipReason(record) {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    return { reason: 'record is not an object' };
  }
  const missing = REQUIRED_FIELDS.filter((field) => {
    const value = cleanString(record[field]);
    return value === null || value === '';
  });
  if (missing.length > 0) {
    return { reason: `missing required field(s): ${missing.join(', ')}` };
  }
  return null;
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  const startedAt = Date.now();
  await connectDatabase();
  console.log(`connected - importing from ${config.schoolsFile}`);

  const raw = await readJsonFile(config.schoolsFile, 'schools.json');
  if (!Array.isArray(raw)) {
    throw new Error('schools.json must be a JSON array of school records');
  }
  console.log(`read ${raw.length} record(s) from the file`);

  const operations = [];
  const skipped = [];

  raw.forEach((record, index) => {
    const skipReason = findSkipReason(record);
    if (skipReason) {
      skipped.push({ row: index + 1, ...skipReason });
      return;
    }

    const document = toSchoolDocument(record);
    operations.push({
      updateOne: {
        // udiseCode is the school's identity, so it is both the upsert key and
        // the guarantee that a second run cannot duplicate a school.
        filter: { udiseCode: document.udiseCode },
        update: { $set: document },
        upsert: true,
      },
    });
  });

  if (skipped.length > 0) {
    console.log(`\n${skipped.length} record(s) will be skipped:`);
    for (const entry of skipped) {
      console.log(`  row ${entry.row}: ${entry.reason}`);
    }
  }

  let inserted = 0;
  let updated = 0;
  const batches = chunk(operations, CHUNK_SIZE);

  for (let i = 0; i < batches.length; i += 1) {
    const result = await School.bulkWrite(batches[i], { ordered: false });
    inserted += result.upsertedCount;
    updated += result.matchedCount;
    process.stdout.write(`\rwrote ${inserted + updated}/${operations.length}`);
  }
  process.stdout.write('\n');

  const total = await School.estimatedDocumentCount();
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log('\n--- summary ---');
  console.log(`records in file : ${raw.length}`);
  console.log(`inserted        : ${inserted}`);
  console.log(`updated         : ${updated}`);
  console.log(`skipped         : ${skipped.length}`);
  if (skipped.length > 0) {
    const byReason = skipped.reduce((counts, entry) => {
      counts[entry.reason] = (counts[entry.reason] || 0) + 1;
      return counts;
    }, {});
    for (const [reason, count] of Object.entries(byReason)) {
      console.log(`   - ${count} x ${reason}`);
    }
  }
  console.log(`schools in db   : ${total}`);
  console.log(`took            : ${seconds}s`);
  console.log('\nRe-run this command as often as you like: udiseCode upserts make it safe.');
}

main()
  .then(() => disconnectDatabase())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error(`\nImport failed: ${error.message}`);
    await disconnectDatabase().catch(() => {});
    process.exit(1);
  });
