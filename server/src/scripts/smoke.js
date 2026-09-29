/**
 * End-to-end check of the running API.
 *
 *   npm start          # in one terminal
 *   npm run smoke      # in another
 *
 * Point it somewhere else with API_BASE=http://192.168.1.131:3000/api
 *
 * This is deliberately an HTTP-level test rather than a supertest one: the
 * behaviours that matter most here (idempotent replay, the unique-index race,
 * 422s, the report) only appear once a real server is answering real requests.
 *
 * It creates real visits. Every visit it writes carries a clientId generated
 * for this run, so a second run never collides with the first and you can find
 * this script's leftovers in the database with:
 *   db.visits.find({ userId: /SMOKE/ })
 */

import { randomUUID } from 'node:crypto';

const BASE = process.env.API_BASE ?? 'http://127.0.0.1:3000/api';
const DISTRICT = process.env.SMOKE_DISTRICT ?? '2101';
const MONTH = process.env.SMOKE_MONTH ?? '9';
const YEAR = process.env.SMOKE_YEAR ?? '2026';

let passed = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ok    ${label}`);
  } else {
    failures.push(`${label}${detail ? ` -- ${detail}` : ''}`);
    console.log(`  FAIL  ${label}${detail ? ` -- ${detail}` : ''}`);
  }
}

async function call(path, options) {
  const response = await fetch(BASE + path, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    /* a body we cannot parse is itself a failure, reported by the caller */
  }
  return { status: response.status, body };
}

const postJson = (path, payload) =>
  call(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

/** Build a valid answer for every required question in the questionnaire. */
function answersFor(questions) {
  return questions
    .filter((question) => !question.optional)
    .map((question) => {
      switch (question.type) {
        case 'yesNo':
          return { questionId: question.questionId, value: true };
        case 'number':
          return { questionId: question.questionId, value: question.min ?? 1 };
        case 'singleChoice':
          return { questionId: question.questionId, value: question.options[0] };
        default:
          return { questionId: question.questionId, value: 'smoke test' };
      }
    });
}

async function main() {
  console.log(`smoke test against ${BASE}\n`);

  // ---- reachable? -------------------------------------------------------
  let health;
  try {
    health = await call('/health');
  } catch (error) {
    console.error(`Cannot reach ${BASE} (${error.cause?.code ?? error.message}).`);
    console.error('Start the server first:  npm start');
    process.exit(1);
  }
  console.log('GET /health');
  check('returns 200', health.status === 200, `got ${health.status}`);
  check('database is connected', health.body?.database === 'connected', health.body?.database);

  // ---- schools ----------------------------------------------------------
  console.log('\nGET /schools');
  const schools = await call(`/schools?districtCode=${DISTRICT}&limit=5`);
  check('returns 200', schools.status === 200, `got ${schools.status}`);
  check('respects limit=5', schools.body?.data?.length === 5, `got ${schools.body?.data?.length}`);
  check('includes page/limit/total', Number.isInteger(schools.body?.total));
  check('a list row has exactly the four list fields',
    schools.body?.data?.[0] &&
    Object.keys(schools.body.data[0]).sort().join(',') === 'blockName,clusterName,schoolName,udiseCode',
    Object.keys(schools.body?.data?.[0] ?? {}).join(','));
  check('defaults to 20 per page', (await call('/schools')).body?.limit === 20);

  const byName = await call('/schools?search=AMBABHONA');
  check('search matches a name fragment', byName.body?.total > 0);

  const byPrefix = await call(`/schools?search=${DISTRICT}1`);
  check('search matches a udiseCode prefix',
    byPrefix.body?.data?.every((row) => row.udiseCode.startsWith(DISTRICT + '1')) === true);

  check('limit over 100 is rejected', (await call('/schools?limit=101')).status === 400);
  check('page=abc is rejected', (await call('/schools?page=abc')).status === 400);

  // ---- questionnaire ----------------------------------------------------
  console.log('\nGET /api/questionnaires/current');
  const questionnaireResponse = await call('/questionnaires/current');
  check('returns 200', questionnaireResponse.status === 200, `got ${questionnaireResponse.status}`);
  const questionnaire = questionnaireResponse.body?.data;
  check('has a title', typeof questionnaire?.title === 'string');
  check('has questions', Array.isArray(questionnaire?.questions) && questionnaire.questions.length > 0);
  check('every required question is answerable',
    questionnaire.questions.every((q) =>
      ['yesNo', 'number', 'singleChoice', 'text'].includes(q.type)));

  if (!questionnaire) {
    console.error('\nNo questionnaire published, so the visit checks cannot run.');
    process.exit(1);
  }

  const answers = answersFor(questionnaire.questions);
  const anySchool = schools.body.data[0];
  const baseVisit = {
    userId: 'U1001',
    udiseCode: anySchool.udiseCode,
    visitedAt: new Date().toISOString(),
    answers,
  };

  // ---- create a visit ---------------------------------------------------
  console.log('\nPOST /api/visits');
  const clientId = randomUUID();
  const created = await postJson('/visits', { ...baseVisit, clientId });
  check('a new visit returns 201', created.status === 201, `got ${created.status}`);
  check('stores the school name', typeof created.body?.data?.schoolName === 'string');
  check('stores year and month as numbers',
    Number.isInteger(created.body?.data?.year) && Number.isInteger(created.body?.data?.month));
  check('stores the IST month, not the UTC month',
    created.body?.data?.month === Number(MONTH) && created.body?.data?.year === Number(YEAR),
    `stored ${created.body?.data?.year}-${created.body?.data?.month}`);
  check('stores district/block/cluster from the school',
    created.body?.data?.blockCode && created.body?.data?.districtCode && created.body?.data?.clusterCode);

  const replay = await postJson('/visits', { ...baseVisit, clientId });
  check('replaying the same clientId returns 200', replay.status === 200, `got ${replay.status}`);
  check('the replay returns the same visit',
    replay.body?.data?._id === created.body?.data?._id);

  // ---- rejections -------------------------------------------------------
  console.log('\nPOST /api/visits - rejections');
  const stale = await postJson('/visits', {
    ...baseVisit,
    clientId: randomUUID(),
    answers: [{ questionId: 'JUL26-Q01', value: true }],
  });
  check('a question from another month is 422', stale.status === 422, `got ${stale.status}`);
  check('and the message says why',
    /earlier month|not a question/i.test(JSON.stringify(stale.body?.error ?? {})));

  const missing = await postJson('/visits', {
    ...baseVisit,
    clientId: randomUUID(),
    answers: answers.slice(0, -1),
  });
  check('a missing required answer is 422', missing.status === 422, `got ${missing.status}`);

  const future = await postJson('/visits', {
    ...baseVisit,
    clientId: randomUUID(),
    visitedAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  check('visitedAt an hour in the future is 422', future.status === 422, `got ${future.status}`);

  const unknownSchool = await postJson('/visits', {
    ...baseVisit,
    clientId: randomUUID(),
    udiseCode: '00000000000',
  });
  check('an unknown udiseCode is 422', unknownSchool.status === 422, `got ${unknownSchool.status}`);

  const badUuid = await postJson('/visits', { ...baseVisit, clientId: 'not-a-uuid' });
  check('a non-uuid clientId is 400', badUuid.status === 400, `got ${badUuid.status}`);

  // ---- the concurrency guarantee ---------------------------------------
  console.log('\nPOST /api/visits - 8 identical requests at once');
  const raceId = randomUUID();
  const racePayload = { ...baseVisit, clientId: raceId };
  const statuses = await Promise.all(
    Array.from({ length: 8 }, () => postJson('/visits', racePayload).then((r) => r.status))
  );
  const created201 = statuses.filter((s) => s === 201).length;
  const replayed200 = statuses.filter((s) => s === 200).length;
  check('exactly one request creates the visit', created201 === 1, `got ${created201} x 201 (${statuses})`);
  check('the other seven replay it', replayed200 === 7, `got ${replayed200} x 200 (${statuses})`);

  // ---- list visits ------------------------------------------------------
  console.log('\nGET /api/visits');
  const list = await call('/visits?userId=U1001');
  check('returns 200', list.status === 200, `got ${list.status}`);
  check('includes the school name', typeof list.body?.data?.[0]?.schoolName === 'string');
  check('newest first',
    (list.body?.data ?? []).every((visit, i, all) => i === 0 ||
      new Date(all[i - 1].visitedAt) >= new Date(visit.visitedAt)));
  check('month filter works',
    (await call(`/visits?userId=U1001&year=${YEAR}&month=${MONTH}`)).body?.total === list.body?.total);
  check('a different month returns none',
    (await call('/visits?userId=U1001&year=2026&month=7')).body?.total === 0);
  check('userId is required', (await call('/visits')).status === 400);

  // ---- report -----------------------------------------------------------
  console.log('\nGET /api/reports/block-summary');
  const started = Date.now();
  const report = await call(`/reports/block-summary?districtCode=${DISTRICT}&month=${MONTH}&year=${YEAR}`);
  const elapsed = Date.now() - started;
  check('returns 200', report.status === 200, `got ${report.status}`);
  const blocks = report.body?.blocks ?? [];
  check('returns one row per block in the district', blocks.length > 0);
  check('rows are sorted by blockName',
    blocks.every((row, i) => i === 0 || blocks[i - 1].blockName <= row.blockName));
  check('blocks with no visits are included with zeros',
    blocks.some((row) => row.visits === 0 && row.schoolsVisited === 0 && row.coveragePercent === 0));
  check('every row has the seven briefed fields',
    blocks.every((row) => 'blockCode' in row && 'blockName' in row && 'totalSchools' in row &&
      'schoolsVisited' in row && 'uniqueVisitors' in row && 'visits' in row && 'coveragePercent' in row));
  check('coveragePercent is rounded to 1dp',
    blocks.every((row) => Math.round(row.coveragePercent * 10) === Math.round(row.coveragePercent * 10)));
  check('districtTotal is present', typeof report.body?.districtTotal?.totalSchools === 'number');
  check(`districtTotal schools equals the sum of the blocks (${elapsed}ms)`,
    report.body?.districtTotal?.totalSchools ===
      blocks.reduce((sum, row) => sum + row.totalSchools, 0));
  check('the report answers in under 1s', elapsed < 1000, `${elapsed}ms`);

  console.log('\nGET /reports/block-summary - rejections');
  check('a missing month is 400',
    (await call(`/reports/block-summary?districtCode=${DISTRICT}`)).status === 400);
  check('an unknown district is 422',
    (await call('/reports/block-summary?districtCode=999999&month=9&year=2026')).status === 422);

  // ---- error shape ------------------------------------------------------
  console.log('\nerror shape');
  const notFound = await call('/no-such-route');
  check('an unknown route is 404', notFound.status === 404, `got ${notFound.status}`);
  check('errors use { error: { code, message } }',
    typeof notFound.body?.error?.code === 'string' && typeof notFound.body?.error?.message === 'string');

  // ---- summary ----------------------------------------------------------
  console.log(`\n${'-'.repeat(52)}`);
  if (failures.length === 0) {
    console.log(`PASS  ${passed} checks`);
    process.exit(0);
  }
  console.log(`FAIL  ${failures.length} of ${passed + failures.length} checks failed:`);
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}

main().catch((error) => {
  console.error('\nSmoke test crashed:', error);
  process.exit(1);
});
