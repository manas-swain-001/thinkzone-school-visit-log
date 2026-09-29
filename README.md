# School Visit Log — Full Stack Offline-First System

An end-to-end, offline-first field-staff application for logging school visits in rural and low-connectivity environments. Built with a **Node.js/Express + MongoDB** backend and a **React Native (Expo)** mobile application.

The mobile app enables field coordinators to record comprehensive school visits completely offline with automatic on-device queuing. When connectivity is restored, visits synchronize automatically via an **idempotent API** ensuring duplicate records are impossible under all network conditions, retries, and concurrent replays.

```
├── /server       # Express 5 REST API, Mongoose models, import, seed & smoke test scripts
├── /app          # React Native mobile app (Expo SDK 57, Expo Router, TypeScript)
├── /dump         # Pre-built MongoDB database dump (visit_log.archive.gz)
└── README.md     # Complete setup, testing, and architecture documentation
```

---

## 1. System Requirements & Prerequisites

| Tool | Tested Version | Minimum Required | Purpose |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v22.13.1` | `18.0.0+` | Backend API & Metro Bundler runtime |
| **npm** | `v10.9.2` | `9.0.0+` | Package manager |
| **MongoDB Server** | `v8.3.4` | `6.0.0+` | Running locally on `127.0.0.1:27017` |
| **MongoDB Database Tools** | `v100.19.0` | `100.0+` | Provides `mongorestore` & `mongodump` |
| **Android Device or Emulator** | Android 10+ | Android 8+ | Expo Go app installed (or Android SDK emulator) |

> ⚠️ **Important**: Run MongoDB locally or via Docker. Do **not** use MongoDB Atlas or hosted clusters, as evaluation includes offline network testing.

---

## 2. Step-by-Step Setup & Execution Guide

Follow these steps in order to set up, run, and evaluate the entire project from a fresh clone.

### Step 1: Database Setup

Ensure your local MongoDB service is running on `mongodb://127.0.0.1:27017`.

Choose either **Option A** (Instant restore) or **Option B** (Run scripts from scratch):

#### Option A: Instant Database Restore (~3 seconds) — Recommended
A pre-packaged, validated database dump is included in the `/dump` directory:
```bash
# Run from the repository root:
mongorestore --gzip --archive=dump/visit_log.archive.gz --drop
```
*This instantly restores 52,989 schools, 3 monthly questionnaires, 3 demo users, and all required indexes into the `visit_log` database.*

#### Option B: Run Import and Seed Scripts (~50 seconds)
```bash
cd server
npm install
npm run import:schools       # Cleans and upserts 52,989 schools from data/schools.json
npm run seed                 # Seeds questionnaires (Jul-Sep 2026) and 3 demo users
npm run indexes              # Creates every compound and unique index
```

---

### Step 2: Start the Backend API (Terminal 1)

1. Open **Terminal 1** and navigate to the `server` directory:
   ```bash
   cd server
   npm install
   ```

2. Initialize your `.env` configuration:
   ```bash
   # Linux / macOS:
   cp .env.example .env

   # Windows PowerShell:
   Copy-Item .env.example .env
   ```
   *The default configuration (`PORT=3000`, `HOST=0.0.0.0`, `MONGODB_URI=mongodb://127.0.0.1:27017/visit_log`) works immediately without modification.*

3. Start the server:
   ```bash
   npm start
   ```
   *Expected output:*
   ```text
   connected to MongoDB
   API listening on http://0.0.0.0:3000
   For the phone, use this machine's LAN IP, not 127.0.0.1.
   ```

4. Verify server health:
   ```bash
   curl http://localhost:3000/api/health
   ```
   *Expected response:*
   ```json
   {
     "status": "ok",
     "database": "connected",
     "time": "2026-09-29T..."
   }
   ```

---

### Step 3: Run Automated Backend Tests (Terminal 2)

Open **Terminal 2** to run the test suites:

1. **Unit & Integration Test Suite** (Runs in ~1s, no database required):
   ```bash
   cd server
   npm test
   ```
   *Result:* **All 34 unit tests pass** (IST month calculations, date conversions, questionnaire answer validation, whitespace trimming, and error formatting).

2. **Live HTTP Smoke Test** (Tests running API against live MongoDB):
   ```bash
   npm run smoke
   ```
   *Result:* Validates health probe, school pagination, current IST questionnaire, 8-request concurrent idempotency race, 422 rejections, visit timeline, and block summary aggregation in under 1 second.

---

### Step 4: Start the Mobile Application (Terminal 2)

1. Navigate to the `app` directory:
   ```bash
   cd app
   npm install
   ```

2. Set your machine's local Wi-Fi / LAN IP in `app/.env`:
   ```bash
   # Linux / macOS:
   cp .env.example .env

   # Windows PowerShell:
   Copy-Item .env.example .env
   ```

   Find your computer's IP address:
   - **Windows**: run `ipconfig` (look for *IPv4 Address* under your active Wi-Fi or Ethernet adapter, e.g., `192.168.1.131`).
   - **macOS / Linux**: run `ifconfig` or `ip a` (look for `inet` under `en0` or `wlan0`).

   Set `app/.env`:
   ```env
   EXPO_PUBLIC_API_BASE_URL=http://<YOUR_LAN_IP>:3000
   ```
   *(For Android Emulator running on the same PC, you can use `http://10.0.2.2:3000`)*.

3. Start the Expo development server:
   ```bash
   npm start
   # or with cache cleared:
   npx expo start -c
   ```

4. Launch the application:
   - **Android Emulator**: Press **`a`** in the Expo terminal.
   - **Physical Android Phone**: Install **Expo Go** from Google Play, connect your phone to the same Wi-Fi network, and scan the QR code displayed in the terminal (or enter `exp://<YOUR_LAN_IP>:8081`).

> 💡 **In-App Dynamic IP Configurator**: If your Wi-Fi IP changes, you don't need to rebuild or restart! Open the app, tap **Settings** in the top-right header, enter the new API URL, and tap **Test** -> **Save and sync**.

---

## 3. End-to-End Live Evaluation Walkthrough

Follow these 8 steps in order to demonstrate and evaluate the full offline-first functionality:

| Step | Action | Expected Result |
| :--- | :--- | :--- |
| **1. Questions from DB** | Open the app, choose user **Asha Patra (`U1001`)**, select any school, and open the Visit Form. | The form renders 10 dynamic questions fetched directly from MongoDB for the current IST month (`September 2026`). |
| **2. Offline Persistence** | Turn on **Airplane Mode** on your phone. Force-close the app completely and reopen it. Select a school. | The form opens immediately offline with all questions intact from local device cache. |
| **3. Submit Visits Offline** | In Airplane Mode, fill out the form and tap **Submit visit**. Repeat for 1–2 other schools. Open **My Visits**. | All submitted visits appear immediately with **`Pending`** status pills and display their client IDs. |
| **4. Verify Zero Server Records** | Open MongoDB Compass or `mongosh` and inspect the `visits` collection: `db.visits.find()` | None of the offline visits exist on the server yet. |
| **5. Automatic Reconnection Sync** | Turn off Airplane Mode without touching the app. | The app detects network restoration immediately, clears backoff, and automatically synchronizes all pending visits. Status pills change to **`Synced`**. |
| **6. Verify in Database** | Refresh MongoDB: `db.visits.find()` | Each visit is now stored with exact answers, matching `clientId`, denormalized school metadata, and calculated IST `year: 2026, month: 9`. Exactly 1 record exists per `clientId`. |
| **7. Submit Online Visit** | With network connected, fill out and submit one more visit. | Visit uploads immediately and saves directly with **`Synced`** status and HTTP 201 response. |
| **8. Block Summary Report** | Query the report endpoint for the district visited: `GET /api/reports/block-summary?districtCode=2101&month=9&year=2026` | Returns block-by-block aggregation in **< 400ms**. Unvisited blocks show zero counts, visited blocks show updated coverage %, and `districtTotal` accurately aggregates unique visitors. |

---

## 4. API Endpoints Reference

All responses and errors follow a strict, unified envelope format:

- **Success**: `{ "data": ... }` or `{ "data": [...], "page": 1, "limit": 20, "total": 52989, "totalPages": 2650 }`
- **Error**: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }`

| Method | Path | Query / Body Params | Status | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/health` | None | `200` | Liveness probe and database connectivity check. |
| **GET** | `/api/schools` | `districtCode`, `blockCode`, `search`, `page`, `limit` | `200`, `400` | Search schools by name or UDISE prefix with pagination (max limit 100). |
| **GET** | `/api/questionnaires/current` | None | `200`, `404` | Returns dynamic questionnaire for the server's current IST month. |
| **POST** | `/api/visits` | `{ clientId, userId, udiseCode, visitedAt, answers: [...] }` | `201`, `200`, `400`, `422` | **Idempotent visit creation**. Returns `201` for new visits; `200` for replayed `clientId`. |
| **GET** | `/api/visits` | `userId` (required), `year`, `month`, `page`, `limit` | `200`, `400` | User visit timeline sorted newest first (`visitedAt: -1`). |
| **GET** | `/api/reports/block-summary` | `districtCode`, `month`, `year` (all required) | `200`, `400`, `422` | Aggregated block coverage report with district totals. |

### Handled `422 Unprocessable Entity` Codes:
- `SCHOOL_NOT_FOUND`: Submitted `udiseCode` does not exist in `schools`.
- `USER_NOT_FOUND`: Submitted `userId` is not one of the seeded demo users (`U1001`, `U1002`, `U1003`).
- `VISITED_AT_IN_FUTURE`: `visitedAt` is more than 5 minutes ahead of server IST time.
- `QUESTIONNAIRE_NOT_AVAILABLE`: No questionnaire published for the IST month of `visitedAt`.
- `INVALID_ANSWERS`: Missing required questions, invalid types, out-of-range numbers, or stale question IDs from earlier months.
- `DISTRICT_NOT_FOUND`: District code does not exist in database during report generation.

---

## 5. MongoDB Indexes

| Collection | Index | Type | Technical Rationale |
| :--- | :--- | :--- | :--- |
| `schools` | `{ udiseCode: 1 }` | **Unique** | The canonical identifier of a school. Enforces idempotent imports and provides $O(1)$ lookups during visit validation. |
| `schools` | `{ districtCode: 1, blockCode: 1, clusterCode: 1 }` | Compound | Optimizes hierarchical drill-down filtering in UI and groups blocks in coverage reports without collection scans. |
| `questionnaires` | `{ year: 1, month: 1 }` | **Unique** | Enforces exactly one questionnaire per month; allows single-equality indexed lookup for `/api/questionnaires/current`. |
| `users` | `{ userId: 1 }` | **Unique** | Fast user validation on visit submission and listing. |
| `visits` | `{ clientId: 1 }` | **Unique** | **The Concurrency Guarantee**: Prevents duplicate insertions. If two requests with the same UUID race in parallel, MongoDB enforces insertion of one and returns `E11000`, which our service handles gracefully with HTTP 200. |
| `visits` | `{ userId: 1, year: 1, month: 1, visitedAt: -1 }` | Compound | Accelerates `GET /api/visits` timeline queries scoped by user and month, avoiding in-memory sort stages. |
| `visits` | `{ year: 1, month: 1, blockCode: 1, districtCode: 1 }` | Compound | Powers the report pipeline; filters visits directly to the requested month and district before grouping. |

*Verified with `explain('executionStats')`: all branches of the block summary report utilize index prefixes; zero `COLLSCAN` stages.*

---

## 6. Architectural Decisions & Technical Highlights

### 1. Robust IST Month Boundary Handling (`server/src/utils/ist.js`)
Indian Standard Time is a constant offset (`UTC+05:30`) without Daylight Saving Time. Month math is implemented using deterministic UTC component arithmetic on shifted timestamps.
- The server's host timezone (e.g. UTC, US/Eastern, Asia/Kolkata) never shifts month boundaries.
- A visit recorded at `23:55 IST` on September 30th remains accurately mapped to **September**, even if it synchronizes from the offline queue the following morning in October.

### 2. End-to-End Idempotency & Concurrency Safety
Idempotency is guaranteed across two layers:
1. **Application-Level Deduplication**: The server checks existing `clientId` values before validation. Retrying an already-accepted visit never triggers stale-question or validation errors.
2. **Database-Level Atomic Indexing**: If two identical network requests arrive concurrently in the same millisecond, MongoDB's unique index on `clientId` aborts the second insert (`E11000`). The controller intercepts this error and returns the winner's record with `HTTP 200 OK`.

### 3. High-Performance MongoDB Aggregation Report (`server/src/services/reportService.js`)
- **Starting from `schools`**: The aggregation starts from the `schools` collection and `$lookup`s matching visits. This ensures unvisited blocks appear with 0 visits and 0.0% coverage rather than being omitted.
- **Set Arithmetic**: Unique visitors and distinct `(user, school)` visit pairs are accumulated using `$addToSet` and `$size`.
- **District Total**: Distinct visitors at the district level are calculated in a unified facet to avoid counting a coordinator who visited two different blocks twice.
- **Speed**: Executes in under **350ms** across 53,000 schools.

### 4. Client-Side Offline-First Sync Engine (`app/src/sync/`)
- **Serialized Write Queue**: All offline visit operations are persisted to AsyncStorage through an asynchronous promise chain to prevent race conditions or corrupted JSON writes.
- **Smart Backoff with Instant Recovery**: Failed sync attempts apply an exponential backoff schedule (5s, 10s, 20s... up to 5 min). Upon network reconnection or manual "Sync now" tap, backoff is automatically cleared to flush the queue immediately.
- **In-App Health Probing**: The app actively probes `/api/health` to verify real backend connectivity, avoiding false negatives on private Wi-Fi networks where external internet is unavailable.

---

## 7. Assumptions & Trade-offs

1. **Whitespace Cleaning**: School names in raw government datasets often contain double internal spaces (e.g. `"GOVT.  PRIMARY  SCHOOL"`). Our import collapses consecutive internal whitespace and trims borders.
2. **Schema Mapping**: Raw `school_type` is mapped to camelCase `schoolType`. Non-briefed fields like `slNo` and raw `_id` are removed during import to permit idempotent upserts without violating MongoDB's immutable `_id` rule.
3. **School Search**: Uses an escaped, case-insensitive regex prefix match on `udiseCode` and substring match on `schoolName` with client-side debounce (400ms) to ensure responsive search without overloading the server.
4. **Error Transparency**: Error responses return a `details` array identifying specific fields that failed validation, allowing the frontend to highlight exact inputs in red.

---

## 8. Demo Users Reference

| User ID | Name | Role |
| :--- | :--- | :--- |
| **`U1001`** | Asha Patra | Cluster coordinator |
| **`U1002`** | Ramesh Nayak | Cluster coordinator |
| **`U1003`** | Sunita Das | Block officer |

*No passwords required. User selection is persisted locally on the device.*
