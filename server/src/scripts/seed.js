/**
 * Seeds the questionnaires and the three demo users.
 *
 *   npm run seed
 *
 * Both writes are upserts (questionnaires on year+month, users on userId), so
 * the script can be re-run safely. The seeded users are what POST /api/visits
 * validates against, so the database is the single source of truth for the
 * user list rather than a constant baked into the code.
 */
import config from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import Questionnaire from '../models/Questionnaire.js';
import User from '../models/User.js';
import { readJsonFile } from '../utils/clean.js';

/** The demo users from the assignment brief. */
const DEMO_USERS = [
  { userId: 'U1001', userName: 'Asha Patra', role: 'Cluster coordinator' },
  { userId: 'U1002', userName: 'Ramesh Nayak', role: 'Cluster coordinator' },
  { userId: 'U1003', userName: 'Sunita Das', role: 'Block officer' },
];

async function seedQuestionnaires() {
  const raw = await readJsonFile(config.questionnairesFile, 'questionnaires.json');
  if (!Array.isArray(raw)) {
    throw new Error('questionnaires.json must be a JSON array of questionnaires');
  }

  let inserted = 0;
  let updated = 0;

  for (const questionnaire of raw) {
    const result = await Questionnaire.updateOne(
      { year: questionnaire.year, month: questionnaire.month },
      {
        $set: {
          title: questionnaire.title,
          questions: questionnaire.questions,
        },
      },
      { upsert: true }
    );
    if (result.upsertedCount > 0) inserted += 1;
    else updated += 1;
  }

  const total = await Questionnaire.countDocuments();
  return { found: raw.length, inserted, updated, total };
}

async function seedUsers() {
  let inserted = 0;
  let updated = 0;

  for (const user of DEMO_USERS) {
    const result = await User.updateOne(
      { userId: user.userId },
      { $set: { userName: user.userName, role: user.role } },
      { upsert: true }
    );
    if (result.upsertedCount > 0) inserted += 1;
    else updated += 1;
  }

  const total = await User.countDocuments();
  return { found: DEMO_USERS.length, inserted, updated, total };
}

async function main() {
  await connectDatabase();
  console.log(`connected - reading from ${config.questionnairesFile}`);

  const questionnaires = await seedQuestionnaires();
  const users = await seedUsers();

  console.log('\n--- questionnaires ---');
  console.log(`in file   : ${questionnaires.found}`);
  console.log(`inserted  : ${questionnaires.inserted}`);
  console.log(`updated   : ${questionnaires.updated}`);
  console.log(`in db     : ${questionnaires.total}`);

  console.log('\n--- users ---');
  console.log(`in code   : ${users.found}`);
  console.log(`inserted  : ${users.inserted}`);
  console.log(`updated   : ${users.updated}`);
  console.log(`in db     : ${users.total}`);

  console.log('\nRe-run this command as often as you like: every write is an upsert.');
}

main()
  .then(() => disconnectDatabase())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error(`\nSeed failed: ${error.message}`);
    await disconnectDatabase().catch(() => {});
    process.exit(1);
  });
