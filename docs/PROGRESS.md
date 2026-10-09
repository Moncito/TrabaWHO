# TrabaWho — PROGRESS.md (build log)

Raw, running log of everything done on TrabaWho during the AppBuildersPH Hackathon 2026 (Local AI theme).
Newest work is appended at the bottom of each section. Numbers are real outputs from `eval/run-eval.ts`; nothing is estimated unless it says so.

- **Team:** 2 people. AI Engineer (Moncito) + Software Engineer.
- **Build Day:** Fri Oct 9, 2026 (remote). **Submission:** 10:00 AM Oct 10 (once, no edits, code freeze). **Demo Day:** Oct 10, 1–7 PM, Cyberzone SM Makati.
- **Repo:** github.com/Moncito/TrabaWHO
- **AI dev tools used:** Claude Code (disclosed in SPEC 10).

---

## 1. Product in one paragraph

TrabaWho is a Grab-style booking app for blue-collar home services in the Philippines (plumbing, electrical, carpentry, aircon, welding). A client types a messy Taglish description ("Ayaw gumana ng saksakan, nag-spark kanina"); a **language model running on the phone** turns it into a bookable job: service, task, urgency, hazards, and a summary. Code (not AI) adds the price range, duration, safety notes and follow-up questions from a bundled catalog. The booking is queued offline and syncs when signal returns. On the worker side, the same on-device model turns a free-form job report into an itemized list of tasks, materials and duration; the worker types prices and code computes the total. Everything AI works in airplane mode.

**Why local (submission answer):** home-repair problems happen where signal fails (brownouts, basements). The AI runs entirely on the phone: no data, no load cost, and descriptions of the inside of someone's home never leave the device. Only the approved booking and report sync to the server.

---

## 2. Timeline of work (Oct 9)

### 2.1 Planning
- Read the original `SPEC.md` and `ARCHITECTURE.md` (written for a 4-person team).
- **Re-scoped for 2 people** (docs v0.2):
  - Cut: voice input (Whisper), Ask-the-Guide, real sign-up/auth (replaced by seeded accounts + `x-user-id` header), in-app model download (adb preload instead), catalog sync endpoint, cancel booking, availability toggle.
  - Kept: on-device intake → Booking Card, offline outbox + idempotent sync, online first-accept-wins, worker report → totals.
  - Catalog trimmed to 5 services × (3 tasks + `_INSPECT`) = 20 tasks; eval sets 20 intake + 5 report.
- Wrote `docs/TASKS.md`: full per-person task list (AI vs SWE), hour checkpoints (H3 build + model JSON, H8 offline intake, H14 end-to-end, H18 freeze, H20 videos), CI plan, cut list.

### 2.2 Shared AI package (`packages/shared`)
- **Zod schemas** (`src/schemas.ts`): `IntakeResult`, `ReportDraft`, `BookingCardData`, `BookingCreate`, `ReportCreate`, enums for 5 services, 20 task codes, 6 hazards, urgency, confidence, booking status.
- **Catalog** (`catalog.json`): services with keywords; tasks with Taglish/English names, Taglish prompt hints, illustrative PHP price ranges, minute ranges, 1–2 follow-up questions; hazards with urgency floor, hotline flag, default service, Taglish safety note. `validateCatalog()` checks it matches the enums, prices min ≤ max, every service has `_INSPECT`, GAS_SMELL shows the hotline.
- **Rules engine** (`src/rules/`), plain code, no AI:
  - `urgency.ts`: hazards raise urgency to a floor (GAS_SMELL/SPARKING/BURNING_SMELL/ACTIVE_FLOODING → EMERGENCY; NO_POWER/STRUCTURAL_DAMAGE → TODAY); never lowers.
  - `pricing.ts`: estimate from catalog; labor = catalog midpoint rounded to ₱10; report totals = labor + Σ(qty × worker-entered unit price).
  - `safety.ts`: pre-written safety notes; GAS_SMELL and BURNING_SMELL show 911.
  - `fallback.ts`: keyword classifier used when the model fails twice (whole-word match for short keywords, substring for long; task keywords weighted ×2).
  - `bookingCard.ts`: `normalizeIntake()` (task must belong to service else `_INSPECT` + low confidence; hazards found by keywords in the original text are always added; floors applied) and `buildBookingCard()`.
  - `duration.ts` (added later, see 2.6).
- **AI pipeline** (`src/ai/pipeline.ts`): prompt → LLM (JSON-schema constrained) → Zod → retry once with the error → keyword fallback → rules engine. Backends only supply one function `LlmCall({ messages, jsonSchema, maxTokens }) → string`, so phone, laptop and eval run identical logic.
- **AIService interface** (`src/ai/AIService.ts`): `init()`, `modelId`, `intake(text) → BookingCardData | null` (null = show service picker), `extractReport(text, bookingTask) → ReportDraft`.
- **Prompts** (`src/ai/prompts.ts`): intake system prompt + 6 Taglish few-shot examples; report system prompt + 3 few-shot examples.

### 2.3 Eval
- `eval/intake.json`: 20 Taglish/English cases (vague, mixed, hazards, English-only). `eval/report.json`: 5 worker reports with expected tasks, materials, duration.
- `eval/run-eval.ts`: backends `ollama`, `llamacpp` (llama-server, OpenAI-compatible), `keywords`; prints per-case results, accuracy and latency; saves `eval/results/<model>.json`.
- Tests guarantee eval codes exist in the catalog and few-shot examples are not copied into the eval set.

### 2.4 Bugs found and fixed
- **Gas leak with no service keyword produced no card**, so the gas safety note never showed ("may naaamoy akong gas"). Fix: hazards carry a `defaultService`; a detected hazard always yields a card; `gas` added as a hazard keyword. Test added.
- **Eval silently measured keywords when Ollama was down**: every call failed and fell back, so "model" results were really the keyword baseline. Fix: preflight check (server reachable, model pulled) and refuse to save results when every model call failed.
- **Report durations from the model were wrong** ("dalawang oras" → 200, "isang oras at kalahati" → 60). Fix: `parseDurationMinutes()` in code (Taglish/English numbers, oras/minutes, "at kalahati", "kalahating oras"); the model's number is used only when no duration is stated. `m` deliberately not treated as minutes ("2 m wire" = meters).
- **Model copied a few-shot material** ("Electrical wire") into an unrelated report. Fix: few-shot materials no longer overlap the eval; prompt says "ONLY materials the worker says".
- **Report tasks**: booked task always first; `_INSPECT` dropped when a real task is present.

### 2.5 Monorepo + stack installed
- npm workspaces: `apps/mobile`, `apps/api`, `packages/shared`, `eval`.
- **Mobile** (`apps/mobile`): `create-expo-app` (SDK 57, React Native 0.86, React 19.2, Expo Router, Reanimated 4.5). Added NativeWind 4.2.7 + Tailwind 3.4 (NativeWind 4 requires Tailwind 3; v5 still RC), llama.rn 0.12.9 (latest stable; 0.13 is RC), expo-sqlite, NetInfo, expo-crypto, phosphor-react-native + react-native-svg, Anton + Archivo fonts, Zod. Replaced the template demo with our routes (login, client new-problem / booking-card / bookings, worker jobs / job/[id] / report), `Screen` placeholder components, AI services (`StubService` = keywords only for Expo Go/web, `LlamaService` = llama.rn, `OllamaService` = Edge mode) selected by `EXPO_PUBLIC_AI_BACKEND`. Verified: typecheck passes, `expo export --platform android` bundles.
- **API** (`apps/api`): Express 5 + Prisma 6.19.3 (Prisma 7 changed datasource config). Schema: `User` (worker fields merged in), `Booking` (unique `clientRef`), `JobReport` (unique `clientRef`, `bookingId`). Routes: `/health`, `/users`, `POST /bookings` (idempotent, server recomputes price), `GET /bookings/mine`, `GET /bookings/open` (same city + service), `POST /bookings/:id/accept` (first-accept-wins via conditional `updateMany`, 409 if taken), `/start`, `/report` (idempotent, totals recomputed server-side, booking → COMPLETED in a transaction). Demo-only `x-user-id` auth. Seed: 2 clients + 10 workers, fixed UUIDs, Quezon City. Verified: `prisma validate`, `prisma generate`, typecheck. **Not yet run against Supabase.**
- **Model path on phone:** `/sdcard/Android/data/ph.trabawho.app/files/model.gguf` (app's own folder; `/sdcard/Download` needs storage permission on Android 11+).

### 2.6 Model selection and prompt tuning (laptop, Ollama 0.40.1)

| Run | Service | Task | Hazards | Report tasks | Materials | Duration | Avg latency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Keyword rules only | 19/20 | 16/20 | 19/20 | 5/5 | 0/7 | 3/5 | ~0 ms |
| Qwen3 1.7B, first prompt | 19/20 | 10/20 | 19/20 | 4/5 | 3/7 | 3/5 | ~1.4 s |
| Qwen3 1.7B, tasks grouped by service + Taglish hints | 19/20 | **16/20** | 19/20 | 4/5 | 3/7 | 3/5 | ~0.8 s |
| Qwen3 1.7B, + code-parsed duration, report fixes | 19/20 | 16/20 | 19/20 | **5/5** | **4/7** | **5/5** | ~0.7 s intake / ~1.1 s report |
| Gemma 3 1B (final prompt) | 17/20 | 9/20 | 19/20 | 5/5 | 3/7 | 5/5 | ~1.2 s |

- **Decision: Qwen3 1.7B (Q4_K_M).** Gemma 3 1B is worse and not faster.
- First call per session ~13–21 s (model load); the app must warm the model up at start.
- Hint phrases that copied eval wording ("natanggal sa riles", "tank stand", "pumutok ang tubo", "pag nagsaksak") were removed to avoid inflating results.
- **Honesty caveat:** prompts were tuned while looking at `intake.json`. A held-out set (`eval/heldout.json`, 10 cases written by the SWE without seeing the eval or prompts) will be run once and reported alongside.

### 2.7 Model vs keyword rules (added after reading the official briefing)
The eval now scores the keyword-only pipeline on the same cases and prints a side-by-side table:

| Metric (intake.json / report.json) | qwen3:1.7b (local) | Keyword rules only |
| --- | --- | --- |
| Intake: service | 19/20 | 19/20 |
| Intake: task | 16/20 | 16/20 |
| Report: materials extracted | 4/7 | 0/7 |

- On the tuned set they tie on task but miss **different** cases (model wins i04, i12, i16; keywords win i03, i09, i19).
- Only the model extracts materials and writes the summary. The held-out set has to show the model generalizes to phrasing no one wrote keywords for.
- New flags: `--intake-file`, `--report-file`, `--tag`.

### 2.8 Phone model file
- Hugging Face download (`unsloth/Qwen3-1.7B-GGUF`, `Qwen3-1.7B-Q4_K_M.gguf`) ran at ~61 kB/s (~5 h). Cancelled.
- Reused Ollama's local copy instead: Ollama stores the model as a GGUF blob (header `GGUF`, Q4_K_M, family qwen3, 1.27 GB). Copied to `models/qwen3-1.7b-q4_k_m.gguf` (git-ignored). Same file the eval ran on, so phone results match the benchmark model.

### 2.9 Design (background agent)
- Design canvas artifact: https://claude.ai/artifact/Ksz7G7dpk9nNyxshbVjVdG (23 boards: design system, flows, client C01–C12, worker W01–W06, system states S01–S03).
- `docs/DESIGN.md`: tokens (Charcoal #1F2937, Lime #A3E635, Soft Gray #F3F4F6 + status colors), Anton/Archivo (Impact can't be bundled), Phosphor icon names, ~25 components with props, 11 animations (must / nice / skip).
- `docs/FLOWS.md`: route map, client/worker navigation, booking state machine + local PENDING/FAILED, sync sequence, per-screen data/API.

### 2.10 CI (`.github/workflows/ci.yml`)
- `check`: `npm ci` → Prisma validate + generate → typecheck all workspaces → unit tests → catalog validation → keyword-only eval.
- `android-bundle`: `expo export --platform android`.
- Not in CI: real model eval (run locally, commit results), DB migrations, APK build.

### 2.12 On-phone AI stats screen (branch `ai/stats-panel`)
- `apps/mobile/src/ai/stats.ts`: in-memory telemetry (nothing sent anywhere): backend, model id, load state + load time, last 20 calls with latency, source (model / fallback / none), attempts, prompt/generated tokens and tokens/s from llama.rn `timings`.
- All three backends (llama, ollama, stub) record every intake/report call.
- `/ai-stats` screen: offline banner ("Walang internet. AI is running on this phone."), model + backend, model load time, avg answer time, tokens/s, model answers vs fallback, recent calls, reset. Linked from login and "Ano ang problema?".
- Model load + warm-up now starts in the background at app launch (first call was ~13–21 s on laptop otherwise).
- Verified: mobile typecheck, Android bundle, and in the browser (web, stub mode): login → type "may naaamoy akong gas sa kusina" → Booking Card shows Tubero / Inspeksyon ng tubero / EMERGENCY / ₱300–₱600 / gas safety note with 911 → AI stats shows the call. On-phone numbers pending the dev build.
- Purpose: demo step 6 ("Proof") and the measured phone latency for the README/pitch.

### 2.11 Official briefing alignment (Participant Briefing PDF)
- Fits the theme ("useful when the cloud disappears"; meaningful inference on device).
- Added to plans: X/LinkedIn post (tag Devin/Cognition, #AppBuildersPH) is required; ~1-minute demo video; submit once only; repo public by 10:00 AM with code freeze; GitHub Release APK before deadline; names must match the official list; in-person pitch; phone mirroring with scrcpy; own hotspot; Q&A prep. Scoring weights captured in TASKS 6.3 and SPEC header.

---

## 3. Current status

| Area | Status |
| --- | --- |
| Shared types, catalog, rules, AI pipeline | ✅ done, 39 tests pass |
| Model chosen + prompts tuned | ✅ Qwen3 1.7B Q4_K_M |
| Eval + model-vs-keywords comparison | ✅ done |
| Mobile scaffold (Expo + NativeWind + llama.rn) | ✅ bundles; stub screens |
| API (Express + Prisma) | ✅ code done; ⏳ not run against Supabase |
| CI | ✅ |
| Design artboard + DESIGN/FLOWS docs | ✅ |
| Dev build on phone (16 GB RAM device) | 🔄 SWE in progress |
| Model on phone + measured latency | ⏳ waiting on dev build |
| Real screens, outbox/sync | ⏳ SWE |
| Held-out eval set | ⏳ SWE writes, AI runs once |
| README for judges, videos, X/LinkedIn post, submission | ⏳ |

## 4. Open decisions
1. Urgency lock: client can't lower urgency below a hazard's floor (design default). Confirm.
2. Booking detail: filter `GET /bookings/mine` or add `GET /bookings/:id`.
3. Copy: "Cash on completion" vs "Cash pagkatapos ng trabaho".
4. API hosting for Demo Day: laptop on personal hotspot (recommended) or Render.
5. Optional: Qwen3 4B on the 16 GB phone if latency allows (eval first).

## 5. Useful commands

```bash
npm install
npm test
npm run typecheck
npm run validate:catalog
npm run eval -- --backend keywords
npm run eval -- --backend ollama --model qwen3:1.7b
npm run eval -- --backend ollama --model qwen3:1.7b --intake-file heldout.json --only intake --tag heldout
npm run dev -w @trabawho/api
cd apps/mobile && npx expo start
adb push models/qwen3-1.7b-q4_k_m.gguf /sdcard/Android/data/ph.trabawho.app/files/model.gguf
```

(Windows PowerShell blocks `npm.ps1`; use `npm.cmd` or Git Bash.)

---

## 6. Change log (append below)

- **Oct 9:** docs v0.2 rescope; TASKS.md; shared package; eval; monorepo + mobile + API scaffold; CI; design docs; model selection; model-vs-keywords comparison; briefing alignment; model file from Ollama blob.
- **Oct 9:** git workflow: feature branches, commits as Moncito, Moncito merges. Branches: `docs/progress-log` (this file), `ai/stats-panel` (AI stats screen + launch warm-up).
