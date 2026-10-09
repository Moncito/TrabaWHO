# TrabaWho — TASKS.md (full task list, 2-person team)

**Deadline:** submission **10:00 AM, Oct 10** (no extensions, code freeze). **Pitch:** Demo Day, Oct 10, 1–7 PM, Cyberzone SM Makati (in person). Companion to `SPEC.md` and `ARCHITECTURE.md`.
**People:** **AI** = AI Engineer · **SWE** = Software Engineer · **BOTH** = do together.
**Rule:** if a task is late by more than 1 hour, check the cut list (section 7) before continuing.

Time is in hours from start (H0). Put the real clock time next to each checkpoint when you start, e.g. `H8 (02:00)`.

---

## 0. Hour 0 — together (first 30–45 min)

- [ ] **BOTH** Create GitHub repo, push current docs, add each other as collaborators.
- [ ] **BOTH** Agree on the `AIService` interface and the types in `packages/shared` (ARCHITECTURE 3.2). Write them down in code first (types only).
- [ ] **BOTH** Pick demo phones: the client phone needs **≥ 6 GB RAM**; the worker side can be a second phone or an emulator.
- [ ] **SWE** Create the Supabase project; put `DATABASE_URL` and `DIRECT_URL` in a shared password manager or DM (never in git).
- [ ] **BOTH** Branch rule: work on short branches (`ai/...`, `swe/...`), open a PR, merge yourself when CI is green. No required reviews. Pull `main` often.

## 1. Monorepo scaffold (SWE, H0–H1)

- [ ] npm workspaces root `package.json` with `apps/*` and `packages/*`.
- [ ] `apps/mobile`: `npx create-expo-app` (TypeScript, Expo Router).
- [ ] `apps/api`: Express + TypeScript + Prisma.
- [ ] `packages/shared`: empty package with `src/index.ts` (AI fills it).
- [ ] Root scripts: `typecheck`, `lint`, `test` that run across workspaces.
- [ ] `.gitignore` (node_modules, `.env`, `*.gguf`, `android/`, `ios/`, build output).
- [ ] `.env.example` for `apps/api` (keys only, no values).
- [ ] Add `.github/workflows/ci.yml` (section 5).

---

## 2. AI Engineer tasks

### Phase A — Data and contracts (H0–H3)

- [ ] `packages/shared/src/schemas.ts`: Zod schemas for `IntakeResult`, `ReportDraft`, `BookingCardData`, `BookingCreate`, `ReportCreate`. Export inferred TS types. **Push early: SWE is blocked on this.**
- [ ] `packages/shared/catalog.json`: 5 services, 20 tasks (3 + `_INSPECT` each), 6 hazards with Taglish safety notes, 1–2 follow-up questions per task, illustrative prices.
- [ ] `packages/shared/src/catalog.ts`: typed loader + `validateCatalog()` (every task's service exists, prices min ≤ max, etc.).
- [ ] `eval/intake.json`: 20 Taglish cases `{ text, expectedService, expectedTask, expectedHazards? }`. Include vague, mixed, hazard and English-only cases.
- [ ] `eval/report.json`: 5 cases `{ text, taskCode, expectedMaterials, expectedDuration }`.

### Phase B — Model choice on laptop (H1–H4)

- [ ] Download 2 candidate GGUF models (e.g., Qwen3 1.7B Q4, Gemma small instruct Q4). Do not commit them.
- [ ] Run them with Ollama or llama.cpp server on the laptop.
- [ ] `apps/mobile/src/ai/prompts.ts`: intake prompt (rules + compact catalog + 4–6 few-shot examples) and report prompt.
- [ ] `eval/run-eval.ts`: runs both sets against an endpoint, prints service accuracy, task accuracy, report field accuracy, average latency. Writes `eval/results/<model>.json`.
- [ ] Pick the model. Record the numbers.

### Phase C — Rules engine (H3–H5, pure code, unit tested)

- [ ] `apps/mobile/src/rules/urgency.ts`: urgency floors from hazards (SPEC 5.1 rules).
- [ ] `apps/mobile/src/rules/pricing.ts`: price/duration from task; labor midpoint; report totals.
- [ ] `apps/mobile/src/rules/safety.ts`: safety notes from hazards; `GAS_SMELL` always adds 911.
- [ ] `apps/mobile/src/rules/fallback.ts`: keyword fallback (e.g. "tulo", "gripo" → `PLUMBING_INSPECT`).
- [ ] Unit tests (Vitest or Jest) for all four. These run in CI.

### Phase D — On-phone AI (H4–H8)

- [ ] Add `llama.rn` to `apps/mobile` (coordinate with SWE: native module, needs a rebuild).
- [ ] `apps/mobile/src/ai/LlamaService.ts`: `init()` loads model from device storage, warm-up call.
- [ ] Grammar / JSON-schema constrained output (verify the API in the installed llama.rn version).
- [ ] `intake()`: prompt → LLM → Zod → retry once → keyword fallback → rules engine → `BookingCardData`.
- [ ] `extractReport()`: same pattern for reports.
- [ ] `apps/mobile/src/ai/OllamaService.ts`: same interface over HTTP to a laptop (Edge-mode fallback).
- [ ] `apps/mobile/src/ai/index.ts`: picks Llama / Ollama / Stub by a config flag.
- [ ] Push the model to the phone: `adb push model.gguf /sdcard/Download/` (or the app's files dir), document the exact path in README.
- [ ] Measure on the phone: model load time, intake latency, report latency.
- [ ] **Checkpoint H8:** intake works in airplane mode on the phone.

### Phase E — Quality and proof (H8–H18)

- [ ] Tune prompts on failing eval cases; re-run eval on laptop.
- [ ] Run eval (or at least 10 cases) on the phone; record real latency.
- [ ] Write the eval results table for README and the pitch (model name, quant, phone model, accuracy, latency).
- [ ] Fill in SPEC section 10 (disclosure table).
- [ ] "What runs locally" slide content.

---

## 3. Software Engineer tasks

### Phase A — Native build first (H0–H3, biggest risk)

- [ ] `npx expo prebuild` + `npx expo run:android` on the real phone. Get a dev build installed.
- [ ] Expo Router screens as stubs: `login`, `(client)/new-problem`, `(client)/booking-card`, `(client)/bookings`, `(worker)/jobs`, `(worker)/job/[id]`, `(worker)/report`.
- [ ] `apps/mobile/src/ai/StubService.ts`: returns hardcoded `BookingCardData` / `ReportDraft` using the shared types.
- [ ] Phosphor icons installed and rendering.
- [ ] **Checkpoint H3:** dev build runs on the phone with navigation.

### Phase B — Backend (H2–H6)

- [ ] `apps/api/prisma/schema.prisma` (ARCHITECTURE 5). `prisma migrate dev` against Supabase.
- [ ] `prisma/seed.ts`: 1–2 clients, ~10 workers across 5 services, one city.
- [ ] Middleware: read `x-user-id`, load `User`, 401 if missing.
- [ ] Routes: `/health`, `/users`, `POST /bookings`, `GET /bookings/mine`, `GET /bookings/open`, `POST /bookings/:id/accept`, `POST /bookings/:id/start`, `POST /bookings/:id/report`.
- [ ] Validate request bodies with the shared Zod schemas.
- [ ] Idempotent create on `clientRef` (return existing record if it already exists).
- [ ] Server recomputes price range from `packages/shared/catalog.json`.
- [ ] First-accept-wins with conditional `updateMany` (409 if taken).
- [ ] API tests (supertest) for: idempotent create, accept race (second accept gets 409), report → `COMPLETED`. Run in CI against a throwaway DB, or skip DB tests in CI if setup costs too much time.
- [ ] Host it: team laptop on venue network, or Render/Railway. Put the base URL in the mobile config.

### Phase C — Client screens (H5–H10)

- [ ] Account switcher (`GET /users`, cache the list for offline).
- [ ] New problem screen: text box → `aiService.intake()` → loading state ("Inaanalyze...").
- [ ] Booking Card: service, task, urgency, price range, duration, safety notes, questions, summary. Editable service/task/urgency pickers. Low-confidence banner.
- [ ] Address + barangay inputs, **Book** button.
- [ ] My bookings list with status badges and Pending items.

### Phase D — Offline outbox and sync (H8–H13)

- [ ] `apps/mobile/src/data/db.ts`: expo-sqlite setup, `bookings_cache` and `outbox` tables.
- [ ] `outbox.ts`: `enqueue(type, payload)` with a UUID `clientRef`.
- [ ] `sync.ts`: flush in order on NetInfo reconnect and app foreground; mark sent/failed; increment attempts.
- [ ] UI for "Pending — will send when online" and "Hindi pa naipapadala — susubukan ulit".
- [ ] Polling every 5 s on booking screens while online.

### Phase E — Worker screens (H10–H14)

- [ ] Jobs list: open bookings (online) + my accepted jobs (cached).
- [ ] Job detail: Accept, Start, Call button (`tel:` link).
- [ ] Report screen: text box → `aiService.extractReport()` → editable materials table → worker types unit prices → totals from `rules/pricing.ts` → Save (outbox).
- [ ] **Checkpoint H14:** online booking + offline report + sync works end-to-end.

### Phase F — Release build (H14–H18)

- [ ] Release APK (local `./gradlew assembleRelease` or EAS build). Install on both phones.
- [ ] Keep the last working APK in a shared folder at all times.

---

## 4. Integration and shared work

| When    | Task                                                                                     | Who  |
| ------- | ---------------------------------------------------------------------------------------- | ---- |
| H0      | Interface + shared types agreed                                                          | BOTH |
| H3      | `packages/shared` schemas + catalog merged to `main`                                     | AI   |
| H4–H6   | Add llama.rn to the dev build, rebuild, swap Stub → Llama                                | BOTH |
| H8      | Offline intake test on phone (airplane mode)                                             | BOTH |
| H14     | Full demo run-through (SPEC 9), list bugs                                                | BOTH |
| H18     | **Feature freeze.** Only bug fixes and polish                                            | BOTH |
| H18–H20 | README: setup, recreate steps, disclosures, eval results                                 | AI writes, SWE reviews |
| H18–H20 | Pitch slides (hook, problem, demo, proof, why local)                                     | BOTH |
| H20     | Record full demo video as backup + cut a **~1-min** submission video                     | SWE  |
| H20–H21 | Post the 1-min video on X or LinkedIn (tag Devin / Cognition, #AppBuildersPH)            | BOTH |
| H21     | Held-out eval run, results table in README, GitHub Release with APK                      | AI   |
| H20–H22 | Rehearse the 5-minute demo twice; time it                                                | BOTH |
| ≤ 09:30 | Submit ONCE on Cerebral Valley (section 6). Do not wait until 09:59                      | BOTH |
| 12:00 PM| Demo Day arrival, AV check with phone mirroring (section 6.2)                            | BOTH |

---

## 5. CI pipeline (GitHub Actions)

Keep CI fast (< 3 min) and cheap. CI does **not** run the LLM: a 1 GB model is too slow on free runners. Model eval runs on the laptop and results are committed to `eval/results/`.

| Job          | Trigger                       | What it does                                                                                  | Fails the PR? |
| ------------ | ----------------------------- | --------------------------------------------------------------------------------------------- | ------------- |
| `check`      | every push / PR               | `npm ci`, typecheck, lint, unit tests (rules engine, schemas), catalog validation             | Yes           |
| `api`        | every push / PR (after check) | `prisma validate`, `prisma generate`, build the API                                           | Yes           |
| `apk`        | manual (`workflow_dispatch`)  | EAS cloud Android build (needs `EXPO_TOKEN` secret). Optional: local build is often faster    | No            |
| API deploy   | push to `main`                | Render/Railway auto-deploy from GitHub (configured in their dashboard, not in Actions)        | —             |

Migrations: run `npx prisma migrate deploy` by hand (or as the Render build command) when the schema changes. Don't run migrations from CI against the shared Supabase DB.

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:
    inputs:
      build_apk:
        description: "Run EAS Android build"
        type: boolean
        default: false

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck --workspaces --if-present
      - run: npm run lint --workspaces --if-present
      - run: npm test --workspaces --if-present
      - run: npm run validate:catalog -w packages/shared

  api:
    needs: check
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: postgresql://ci:ci@localhost:5432/ci
      DIRECT_URL: postgresql://ci:ci@localhost:5432/ci
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx prisma validate
        working-directory: apps/api
      - run: npx prisma generate
        working-directory: apps/api
      - run: npm run build -w apps/api

  apk:
    if: github.event_name == 'workflow_dispatch' && inputs.build_apk
    needs: check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform android --profile preview --non-interactive --no-wait
        working-directory: apps/mobile
```

**CI setup tasks**

- [ ] **SWE** Add the workflow once the scaffold exists (it fails on an empty repo).
- [ ] **SWE** Every workspace has `typecheck` (`tsc --noEmit`), `lint`, and `test` scripts (a `test` that just exits 0 is fine for now).
- [ ] **AI** `packages/shared` has `validate:catalog` script, plus tests that every `eval/*.json` code exists in the catalog.
- [ ] **SWE** (optional) `EXPO_TOKEN` secret + `eas.json` with a `preview` profile that builds an APK.
- [ ] **SWE** Connect Render/Railway to the repo for API auto-deploy, with env vars set in their dashboard.

---

## 6. Submission checklist (from the official Participant Briefing)

**Where:** cerebralvalley.ai/e/appbuildersph-hackathon-2026 · **Deadline:** 10:00 AM, Oct 10, no extensions.
**Submit ONCE.** No edits or resubmits. Fill a draft in a shared doc first, both review, then submit.
**Code freezes at 10:00 AM.** Judges review the repo as of the deadline. Anything not pushed by then doesn't exist.

The project
- [ ] Project name: TrabaWho
- [ ] Short description (2–3 sentences, from SPEC 1)
- [ ] Team members: **exact names as listed on appbuildersph.com/hackathon** (anyone not on the list is disqualified)
- [ ] **Public** GitHub repository (check it's public from a logged-out browser)

The proof
- [ ] Demo video, **about 1 minute** (separate from the 5-min backup recording of the full demo)
- [ ] **X or LinkedIn post with the video: tag Devin / Cognition and include #AppBuildersPH** (required), paste its URL
- [ ] What runs locally (SPEC 10)
- [ ] What requires internet (SPEC 10)

The disclosures
- [ ] Models used (Qwen3 1.7B Q4_K_M GGUF via llama.rn; Ollama on laptop for eval / Edge mode)
- [ ] Technologies and frameworks (SPEC 10)
- [ ] APIs and cloud services (**none**: API + PostgreSQL run locally on the laptop; **no cloud AI API**)
- [ ] Existing code and assets (Expo template, Google Fonts Anton/Archivo, Phosphor icons, capstone proposal doc)
- [ ] AI development tools (Claude Code)
- [ ] **Answer: "Why does this product benefit from running AI locally?"** (SPEC 4)

Repo contents before 10:00 AM
- [ ] README: what it is, recreate steps for judges (API, mobile dev build, model download + adb push, or Edge mode with Ollama), demo accounts, "demo-only auth" note
- [ ] Eval results table: **model vs keyword rules**, on `intake.json` AND on the held-out set, with model name, quant, machine/phone (section 6.1)
- [ ] Release APK attached to a GitHub Release (no commits allowed after the deadline)
- [ ] CI green on `main`

### 6.1 Honest benchmark ("fake benchmarks" can get results disputed)

- [ ] **SWE writes `eval/heldout.json`**: 10 new Taglish problem descriptions, same format as `intake.json`, written **without** looking at `intake.json` or the prompts.
- [ ] AI runs it once, no prompt changes afterward:
  `npm run eval -- --backend ollama --model qwen3:1.7b --intake-file heldout.json --only intake --tag heldout`
- [ ] Put both tables (tuned set + held-out set) in README and the pitch. Say plainly that prompts were tuned on `intake.json`.
- [ ] Measure latency on the demo phone (in-app AI stats) and report it next to the laptop numbers.

### 6.2 Demo Day logistics (Oct 10, Cyberzone SM Makati)

| Time | What |
| --- | --- |
| 12:00 PM | Registration and arrival |
| 12:15 PM | Demo and AV technical checks: **test phone mirroring on their projector** |
| 1:00 PM | Opening, finalists announced (10–15 teams) |
| 1:40 PM / 3:40 PM | Finalist pitching (5 min pitch + live demo, 3 min judge Q&A) |
| 5:45 PM | Awards (People's Choice is a QR-code audience vote) |

- [ ] **At least one of us on site in person.** Remote pitching is not allowed.
- [ ] Bring a laptop (they provide HDMI/USB-C to the laptop, not to the phone).
- [ ] **Phone screen on the projector:** install `scrcpy` on the laptop, mirror over USB. Rehearse with it. Airplane mode must be visible on screen.
- [ ] Chargers, USB data cable, power bank. Phones at 100%.
- [ ] API running on the laptop and reachable from the phone over a **personal hotspot** (don't rely on venue Wi-Fi for the online part).
- [ ] Backup: the full demo recording on the laptop, ready to play if anything fails.
- [ ] Prep Q&A answers: "Why not just keywords?" (comparison table: model extracts materials, handles unseen phrasing), "What if the model is wrong?" (client edits; safety text never AI-written), "How big / how fast?" (1.1 GB, measured phone latency), "What's sent to the server?" (only the approved summary, never raw text).

### 6.3 Scoring weights (where to spend the remaining time)

| Criterion | Weight | What it means for us |
| --- | --- | --- |
| Problem & usefulness | 25% | Real users: clients who can't describe trade problems, workers with bad signal |
| Local AI implementation | 25% | Show the model is necessary: the model-vs-keywords table, airplane mode, on-phone stats |
| Technical execution | 20% | **The live demo must not break.** Reliability over features |
| Innovation | 15% | Offline Taglish intake + worker report; voice (local Whisper) only if everything else is done |
| Product & demo quality | 15% | Clean UI from the artboard, rehearsed 5-min demo, few slides |

## 7. Cut list (in order, if behind)

1. Polling polish / status animations.
2. Report material editing UI → show the AI draft read-only with price inputs only.
3. Worker "Start" step → accept goes straight to report.
4. Online accept flow → seed a booking that is already `ACCEPTED`.
5. On-phone model → Edge mode (Ollama on laptop over hotspot), disclosed honestly.

**Never cut:** offline intake → Booking Card → Pending → sync. That is the demo.
