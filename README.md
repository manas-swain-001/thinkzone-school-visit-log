# School Visit Log

A field-staff app for logging school visits, built to work with no network.
The mobile app queues visits on the device and syncs them when it can; the API
is idempotent so a replayed visit can never become two records.

```
/server   Express + Mongoose API, import and seed scripts
/app      React Native app
/dump     mongodump output (restore with the command below)
```

---

## 1. Setup

### Prerequisites

| Tool | Version used | Notes |
| --- | --- | --- |
| Node.js | 22.13.1 | 18+ required |
| MongoDB | 8.3.4 server | 6+ required, running locally |
| MongoDB Database Tools | 100.19.0 | provides `mongodump` / `mongorestore` |
| JDK 17 | 17.0.20.1 | only needed to build the Android app |
| Android SDK | platforms 35 + 36 | only needed to build the Android app |

MongoDB must be reachable at the `MONGODB_URI` below. A local install and a
Docker container both work; do not use a hosted cluster.

### Server

```bash
cd server
npm install
cp .env.example .env          # Windows: Copy-Item .env.example .env
npm run import:schools        # ~50s, loads server/data/schools.json
npm run seed                  # questionnaires + the 3 demo users
npm run indexes               # creates every index (optional, import does it)
npm start                     # http://0.0.0.0:3000
```

Check it is alive:

```bash
curl http://localhost:3000/api/health
```

Environment variables (all in `server/.env`, template in `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | API port |
| `HOST` | `0.0.0.0` | `0.0.0.0` so a phone on the LAN can reach it |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/visit_log` | connection string |
| `SCHOOLS_FILE` | `data/schools.json` | input for the import script |
| `QUESTIONNAIRES_FILE` | `data/questionnaires.json` | input for the seed script |

No secrets are in the repository. `HOST=0.0.0.0` matters: the phone must reach
the laptop over the LAN IP, not `127.0.0.1`.

### Restore the database instead of importing

```bash
mongorestore --gzip --archive=dump/visit_log.archive.gz --drop
```

### App

<!-- TODO(frontend): exact commands, Expo SDK version, and how the phone
     reaches the API. Needed before this README is hand-in ready. -->

### Tests

```bash
cd server && npm test         # 34 tests, no database required
```

---

## 2. API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | liveness probe (not in the brief; the app uses it to tell "server down" from "no network") |
| GET | `/api/schools` | search and page through schools |
| GET | `/api/questionnaires/current` | questions for the current IST month |
| POST | `/api/visits` | save one visit (idempotent) |
| GET | `/api/visits` | a user's visits, newest first |
| GET | `/api/reports/block-summary` | block coverage for a district and month |

Errors always come back in one shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
```

`400` means the request was malformed. `422` means it was understood and
refused (unknown school, stale month, bad answer). The app can therefore treat
any `4xx` as "stop retrying" without reading the body.

`422` codes in use: `SCHOOL_NOT_FOUND`, `USER_NOT_FOUND`, `VISITED_AT_IN_FUTURE`,
`QUESTIONNAIRE_NOT_AVAILABLE`, `INVALID_ANSWERS`, `DISTRICT_NOT_FOUND`.

List endpoints return `{ data, page, limit, total, totalPages }`.

---

## 3. Indexes

### `schools`

| Index | Why |
| --- | --- |
| `udise_unique` `{udiseCode: 1}` unique | The school's identity. Makes the import idempotent (upsert instead of duplicate rows) and is what `POST /api/visits` checks to confirm a school exists. |
| `hierarchy` `{districtCode: 1, blockCode: 1, clusterCode: 1}` | The list screen drills down district -> block -> cluster, and the report groups a district by block. Leading `districtCode` serves both. |

### `questionnaires`

| Index | Why |
| --- | --- |
| `year_month_unique` `{year: 1, month: 1}` unique | There is exactly one questionnaire per month. Uniqueness makes the seed idempotent and lets the "current month" lookup be a single indexed equality. |

### `users`

| Index | Why |
| --- | --- |
| `userId_unique` `{userId: 1}` unique | The value the app sends on every visit, so it must be unique and directly addressable. |

### `visits`

| Index | Why |
| --- | --- |
| `clientId_unique` `{clientId: 1}` unique | **The idempotency guarantee.** Two requests carrying the same `clientId` arriving together cannot both insert; the loser gets E11000 and the service returns the winner with `200`. |
| `user_timeline` `{userId: 1, year: 1, month: 1, visitedAt: -1}` | `GET /api/visits` is always scoped to one user, optionally to a month, and always sorted newest first. `userId` leads because it is the only mandatory filter. |
| `report_scope` `{year: 1, month: 1, blockCode: 1, districtCode: 1}` | The report is always scoped to a month and then grouped by block, so `year, month` lead. The same prefix also serves the district total, which filters on the month and narrows to the district. |

Verified with `explain()` — all four branches of the report use an index and
none is a `COLLSCAN`. The full district report returns 12 blocks in ~344 ms.

---

## 4. Design decisions

**IST is a fixed +05:30 offset, so month maths is plain arithmetic.**
`src/utils/ist.js` is the only place allowed to decide which month a moment
belongs to, and it reads UTC parts off a shifted timestamp. The server's own
timezone cannot move a month boundary — a test runs the same instants under
`Asia/Kolkata`, `America/New_York`, `Pacific/Auckland` and `UTC` and asserts
one result. A visit at 23:50 IST on 30 September stays in September even
though it syncs the following morning.

**Visits are denormalised.** The school name, district, block and cluster codes,
plus the IST `year` and `month`, are copied onto the visit. So listing visits
returns a school name with no lookup, and the report groups a single
collection. No query ever does timezone arithmetic, because months are stored
as numbers and matched with plain equality.

**Idempotency is the server's job, which keeps the client simple.** A replay is
checked before any validation, so retrying a visit cannot start failing because
the month rolled over. Then the unique index settles genuine concurrency.

**Answers are validated by a pure function, not a schema.** Their rules live in
the month's questionnaire document, so they cannot be a static Joi schema.
A question ID from an earlier month is simply an unknown ID, which is how the
brief's stale-data case is caught.

**The report starts from `schools`, not `visits`.** Starting from visits would
silently drop unvisited blocks, which the brief requires to appear as zeros.
Distinct counts are `$addToSet` then `$size`; a `(user, school)` pair is made
unique by concatenating the two into one string.

**`data/schools.json` is committed** (29 MB) so the testing team can run
`npm run import:schools` from a fresh clone without a separate download.

---

## 5. Assumptions

Where the brief left something open, this is what was chosen:

- **Cleaning collapses internal whitespace**, not just the edges. The supplied
  file has 4,896 names like `"GOVT. PRIMARY SCHOOL,  AMBABHONA"` with a double
  space, and the brief warns that fields "have extra spaces". Trimming alone
  would leave those on the list screen.
- **`school_type` is mapped to `schoolType`**, and `slNo` / `isNv` are dropped —
  they are in the file but not in the documented school record. The file's
  `_id` is dropped too, so the `udiseCode` upsert can update a school without
  hitting Mongo's immutable-`_id` rule.
- **Names are stored as supplied** (the source is upper case) because the brief
  only asks for trimming. Codes and names are consistent 1:1 in this dataset.
- **`limit` over 100 is rejected** rather than silently clamped, so the client
  finds out.
- **`/api/reports/block-summary` requires all three** of district, month and
  year; with the district missing it would aggregate the whole country.
- **List endpoints sort by `schoolName`** — the brief does not specify a sort.
- **School search is a case-insensitive regex**, user input escaped before it
  reaches `$regex`. A leading wildcard cannot be served by an index; at 53k
  documents Mongo still does the filtering, so this was an accepted trade-off
  rather than an oversight.
- **Errors carry `details[]`** beyond the `code`/`message` the brief shows, so
  the app can highlight the exact field that failed.

---

## 6. Not finished / known gaps

- <!-- TODO(frontend): fill in as the app is built. -->
- The report's district total computes `uniqueVisitors` with its own group
  rather than by summing the per-block rows. That is deliberate: a user who
  visits two blocks must count once, and per-block counts cannot be summed.
- `uniqueVisitors` on the district total filters `districtCode` after the
  `year, month` index prefix rather than bounding on it directly. At the
  dataset's size the difference is not measurable, but it is the first thing to
  change if visits grow by orders of magnitude.
