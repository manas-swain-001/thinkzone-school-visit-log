/**
 * Creates every declared index in one go.
 *
 *   npm run indexes
 *
 * Mongoose builds indexes in the background, so on a large collection the new
 * index may not be usable the instant this returns. Nothing here is required
 * for correctness on a small dataset; it just gets the database ready.
 */
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import School from '../models/School.js';
import Questionnaire from '../models/Questionnaire.js';
import User from '../models/User.js';
import Visit from '../models/Visit.js';

const models = [School, Questionnaire, User, Visit];

async function main() {
  await connectDatabase();
  console.log('connected');

  for (const model of models) {
    await model.syncIndexes();
    const applied = await model.collection.indexes();
    for (const index of applied) {
      if (index.name === '_id_') continue;
      console.log(
        `  ${model.collection.name.padEnd(16)} ${index.name.padEnd(16)} ${JSON.stringify(index.key)}`
      );
    }
  }
}

main()
  .then(() => disconnectDatabase())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Failed to create indexes:', error.message);
    await disconnectDatabase().catch(() => {});
    process.exit(1);
  });
