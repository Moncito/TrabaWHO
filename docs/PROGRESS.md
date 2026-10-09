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

### 2.13 README for judges (branch `docs/readme`)
- Rewrote `README.md`: one-liner, why local, local-vs-internet table, AI pipeline and design rules, results tables (tuned set, held-out set and on-phone rows marked _pending_), stack, layout, recreate steps (eval on laptop, web stub, API, on-device), demo accounts + demo-auth warning, disclosures, team.
- Re-verified the keyword baseline before publishing: with the code duration parser, keywords-only also scores report duration 5/5 (not 3/5 as in the earlier baseline), so the README says so.
- Clarified: no custom model training is needed. The briefing allows existing open-source models; our work is the system around Qwen3 (prompts, constrained output, rules, fallback, offline pipeline, eval).

### 2.14 In-app model file picker (branch `ai/model-picker`)
- Backup for phones that block `adb push` into `Android/data`.
- `apps/mobile/src/ai/modelFile.ts`: `pickAndImportModel()` opens the system file picker (`File.pickFileAsync` from expo-file-system 57; no extra dependency), checks the name ends in `.gguf`, copies it to the app's documents folder as `model.gguf`, and rejects copies under 100 MB. `resolveModelPath()` prefers the imported copy, then the adb-pushed path.
- `LlamaService`: resolves the path at load time (clear error if none found), records the path in AI stats, and `reload()` releases the old context and loads again.
- AI stats screen: "Pumili ng model file (.gguf)" button (llama backend only), progress text "Kinokopya ang model (~1 minuto)...", and the file path in use.
- Verified: mobile typecheck and Android bundle. Not testable in the browser (button only shows with the on-device backend); needs the phone.

### 2.15 SWE status report (Oct 9, evening)
- **Dev build works**: `npx expo run:android` builds, installs and opens on the demo phone.
- **Demo phone:** Infinix X6873, Android 16, ~8 GB physical RAM (MemTotal 7.6 GB). The earlier "16 GB" counted Infinix's extended virtual RAM. Plenty for Qwen3 1.7B Q4 (1.27 GB).
- **Build issues + fixes** (now in SETUP troubleshooting): OneDrive folder breaks the reanimated CMake build ("build.ninja still dirty") → build from a git worktree outside OneDrive (`C:\dev\trabawho-native`); llama.rn postinstall `tar` fails under Git Bash → install from PowerShell; Gradle needs `android/local.properties` with `sdk.dir`.
- **`adb push` into `Android/data/ph.trabawho.app/files` works** (tested with a small file). Model not pushed yet: the SWE's laptop has no `.gguf` and no Ollama; the AI engineer sends the file.
- **API verified against local Postgres** (no Supabase project yet): migrate + seed (12 users) OK, migration committed. Smoke test: create 201 → duplicate create returns the same id → accept 200 → second accept 409 → start 200 → report → COMPLETED, total ₱800.
- **Phone → API:** over USB via `adb reverse tcp:3000 tcp:3000` (`http://localhost:3000`); on Demo Day `http://<laptop-hotspot-IP>:3000`.
- **Real screens + offline outbox/sync** built on branch `swe/core-flow` (typecheck, tests, bundle pass; phone testing in progress). Not on GitHub yet at the time of this note. It must merge `main` first: `main` changed `login.tsx`, `new-problem.tsx` and the `src/ai/` files (AI stats, model picker).
- **Held-out cases:** the SWE declined to write them and asked the AI engineer to. Plan: the AI engineer writes them without opening `eval/intake.json` or `prompts.ts` (both were drafted with Claude Code, so whoever writes the held-out set should not read them first).
- **Branch cleanup:** merged branches deleted; from now on one working branch per stream (`ai/updates`).

### 2.16 Demo flow verified on the phone (branch `swe/core-flow`)
- **Offline data** (`apps/mobile/src/data/`): expo-sqlite `outbox`, `bookings_cache`, `kv` (session, cached users). Every create writes to the outbox first, then flushes. Flush on reconnect, app foreground, start and after each enqueue; one flush at a time; a network error keeps the row pending and stops; 4xx/5xx marks it failed; report 409 counts as sent. "Online" = NetInfo `isConnected` only, so a demo hotspot without internet still reaches the laptop API.
- **Bug found on device:** React Compiler memoized the SQLite reads inside the hooks, so Pending never flipped on screen even though the server had the booking. Fix: `useDbQuery()` keys each read on the store version.
- **Verified on the Infinix (keyword fallback; model not loaded yet), API on local Postgres over `adb reverse`:**
  - Client, airplane ON: "Ayaw gumana ng saksakan sa kusina, nag-spark kanina" → Elektrisyan / outlet repair / EMERGENCY / ₱400–900 / spark safety note → I-book → Pending. Airplane OFF → row flips to Hinahanapan; server row has `createdOffline=true`.
  - Worker (Ben, Tubero): accept online → airplane ON → Start disabled with reason, I-report works → add material ₱250 → save → Pending. Airplane OFF → COMPLETED; server total ₱1,100 (labor ₱850 + ₱250) matches the phone.
- Without the model, the report extracts no materials (keyword rules can't). That is the model-vs-keywords point for the pitch.

### 2.16 Held-out eval, database decision, team (branch `ai/heldout-eval`)
- `swe/core-flow` merged into `main` (real client/worker screens, SQLite outbox + sync engine, device test log).
- `eval/heldout.json`: 12 cases written by the SWE without seeing `intake.json` or the prompts. Realistic texting: typos and slang ("wla aq 2big sa gripo", "gusto ko magpagawa ng baokd", "paayos ng sidecar ng tricycle").
- **Run once, no prompt changes before or after** (`eval/results/qwen3_1.7b.heldout.json`):

| Held-out (12) | Qwen3 1.7B (local) | Keyword rules only |
| --- | --- | --- |
| Service | **11/12** | 8/12 |
| Task | 4/12 | 5/12 |
| Hazards | 11/12 | — |
| Avg latency (laptop) | ~1.2 s (first call 7.1 s) | ~0 ms |

- Per case: model right / keywords wrong on task: h12. Keywords right / model wrong: h07, h08 (model chose `AIRCON_INSPECT` for short vague aircon messages). Model chose a specific task where the label was `_INSPECT` on h02, h04, h05, h06 (e.g. "paggawa ng kubo" → cabinet). h10 (tricycle sidecar) went to carpentry. h11 "dumidiklap yung saksakan": SPARKING missed by model and rules.
- Reading: the model generalizes far better on **service** (which worker to send); **task** on unseen phrasing is weak and the client confirms it on the Booking Card. Reported as is in README and SPEC 8.
- **Do not tune prompts on `heldout.json`.** Any future prompt/keyword change needs a fresh held-out set to be reported fairly.
- **Disclosed post-held-out safety fix:** added `diklap` and `dikilap` to the SPARKING hazard keywords (catalog) after h11 was missed, with a test. Reported numbers stay the pre-fix ones; README says so. No prompt changes.
- Health check of `main` after the `swe/core-flow` merge: 40 tests pass, catalog valid, typecheck clean (after regenerating local typed routes in `.expo/types`, which is git-ignored), Android bundle builds. AI stats links, launch warm-up and the model picker all survived the merge.
- **Database decision: local PostgreSQL on the laptop** (no Supabase). Disclosures in README, SPEC 10, TASKS 6 and ARCHITECTURE now say: APIs / cloud services = none; no cloud AI API.
- **Team 404:** Marc Ace Flores, Adrian Imbang, Clarence Emlano (README Team section).

### 2.17 First on-phone run + prompt warm-up fix
- Model imported with the in-app picker (`file:///data/user/0/ph.trabawho.app/files/model.gguf`) on the Infinix X6873.
- **AI stats (online, 3 intakes):** model load 4.47 s · answers 34.69 s, 7.95 s, 8.18 s (avg 16.94 s) · ~9 tokens/s · 3/3 answered by the model (no fallback).
- Diagnosis: the 35 s first answer is prompt processing of the full intake prompt (system rules + 20-task catalog + 6 few-shot pairs); llama.cpp then keeps that prefix in its KV cache, so later answers only process the client's text (~8 s, mostly generating ~70 tokens at 9 tok/s).
- Fix: `LlamaService.init()` now warms up with the real intake messages (`intakeMessages(...)`, `maxTokens: 1`) instead of "hi", and resets token counters after. AI stats shows "Prompt warm-up" time separately from model load.
- Still to do on the phone: re-measure after the fix, **in airplane mode** (the first run was online).
- Further speed ideas if needed (not done): shorter summary / fewer output tokens, tune `n_threads`, try Qwen3 0.6B (would need a new eval). Note: the report prompt has a different prefix, so the first report after an intake will re-process its prompt.

### 2.18 On-phone results after the warm-up fix (airplane mode)
- Run by the SWE on the Infinix X6873, **airplane mode on**, 22:08: model load 3.25 s · prompt warm-up 23.5 s (background, at launch) · answers 9.57 s, 7.49 s, 7.56 s (**avg 8.21 s**) · 8.9–9.2 tok/s · 3/3 from the model.
- First answer 34.7 s → 9.57 s: the warm-up fix works.
- Answers: sparking outlet → ELECTRICAL / ELEC_OUTLET_REPAIR / EMERGENCY ✅; overflowing clogged toilet → PLUMBING / PLUMB_CLOG / EMERGENCY + flooding note ✅; "hindi na lumalamig yung aircon" → AIRCON / AIRCON_INSPECT, low confidence ⚠️ (service right, task should be AC_NOT_COLD).
- Screenshot saved as `docs/images/ai-stats-phone-offline.png` and embedded in the README.
- Note: after the run the phone dropped off USB (`adb: device offline`) with airplane mode still on; turn it off by hand.

### 2.19 Code review of the SWE's screens + report prewarm
- Reviewed `swe/core-flow` (now in `main`): SQLite outbox written first, one flush at a time oldest-first, network error → stays pending and retries, server rejection → FAILED with retry, 409 on a report = already done; polling only while focused and online; login list cached for offline; worker "open jobs" online-only, "my jobs" from cache; report totals via shared `computeReportTotals`. No blocking bugs found.
- **Gap found (AI side): first worker report would be slow (~25–30 s).** llama.cpp caches only the last prompt prefix; in the demo the report comes right after an intake, so the report prompt would be processed from scratch.
- Fix: optional `AIService.prewarm(kind, bookingTask?)`. `LlamaService` serializes completions in a queue (prewarm vs. real call can't overlap), and pre-processes the intake prompt when "Ano ang problema?" opens and the report prompt (for that booking's service) when "I-report ang trabaho" opens, while the user types. Prewarm token counts are excluded from AI stats.
- Verified: typecheck, 40 tests, Android bundle. To verify on the phone: time the first report after an intake.

### 2.20 Anti-scam check + first-aid chatbot (branch `ai/safety-features`, worktree `D:\TrabaWHO-ai`)
- Team ideas (Oct 9, ~22:45): flag scam messages ("GCash mo na lang ako directly, cancel mo na yung booking", "deposit muna bago ako pumunta"), and a restricted chatbot with first-aid steps while waiting, a disclaimer, and always pointing back to booking.
- **Anti-scam** (`packages/shared/src/scam`): 7 flags (OFF_APP_PAYMENT, DEPOSIT_FIRST, CANCEL_BOOKING, ASKS_OTP_OR_PASSWORD, SUSPICIOUS_LINK, URGENT_PRESSURE, PRICE_CHANGE). Model (JSON-schema constrained, 6 few-shot) + keyword rules, union; code decides risk (any high-severity flag → HIGH) and shows team-written Taglish warnings. Keywords tightened so normal messages ("cancel ko na lang, may lakad ako", "pa-pin mo location", "send mo address") are not flagged. Screen `scam-check.tsx`: paste → red/amber/green card. Prompt prewarmed on open.
- **First-aid chatbot** (`packages/shared/src/firstaid.ts` + `first-aid.tsx`): reuses the intake pipeline (already-warm prompt, ~8 s on phone), so no new prompt. Reply = hazard alert (catalog safety notes, 911 for gas/burning) + team-written "habang hinihintay" steps per service + disclaimer + "I-book ang <serbisyo>" (clients) which pre-fills the Booking Card. Off-topic guard returns a fixed reply. The model never writes advice. Newest turn shown first (Screen's body can't host an auto-scrolling list without editing `Screen.tsx`, which the redesign session owns).
- Entry points: two header icons in `AccountButtons.tsx` (first-aid kit, shield).
- **Scam eval** (`eval/scam.json`, 12 cases, team-written with the prompt): risk correct 11/12 with model+rules vs 9/12 rules only; 0/4 false alarms; ~0.3 s laptop. Missed s04 (OTP request without "OTP"); not tuned on.
- Verified: 47 tests, typecheck all workspaces, Android bundle. Not yet run on the phone.
- Coordination: messaged the "TrabaWHO Artboard redesign" cloud session with the files touched. Found `D:\TrabaWHO` checked out on the redesign branch `claude/eloquent-lovelace-fpmx44` (local `df512fe` diverged from remote `014f72b`); aborted the accidental merge, touched nothing else there, and moved AI work to the separate worktree.

### 2.21 Full demo run on the phone + fixes (branch `ai/demo-fixes`)
- SWE results (Oct 9, ~22:30–22:56, Infinix, airplane mode where relevant): **full SPEC 9 demo passed** (online book + accept → offline spark intake → Pending → offline worker report → airplane off → both synced; server shows createdOffline=true, job COMPLETED). Worker report after an intake: 7.16 s, 12.6 tok/s, correct tasks/materials/90 min; API total matched (₱1,280). Heat: 14 intakes in a row avg 7.99 s (6.9–9.1), no slowdown, 33.4 → 36.2 °C. Release APK built (133 MB, arm64, debug-signed, API URL localhost via `adb reverse`, model not bundled).
- Problems found: (1) model added ACTIVE_FLOODING to "May tulo sa ilalim ng lababo namin" → false EMERGENCY + flooding warning; (2) summary added "simula kaninang umaga" (copied from the gas few-shot example); (3) "hindi na lumalamig yung aircon" → AIRCON_INSPECT (known task weakness); (4) tapping Suriin within ~20 s of launch waits for the warm-up; (5) README adb steps wrong (adb-created folder unreadable by the app).
- Fixes: `normalizeIntake` keeps model-only hazards only for GAS_SMELL/SPARKING/BURNING_SMELL, others need keyword support in the text; EMERGENCY without any hazard is capped at TODAY. Prompt: summary must use only the client's details; gas example no longer has a time. README: model install via Downloads + in-app picker; wait ~20 s after launch; Qwen3 Apache 2.0 license; phone report + heat numbers. 2 new tests (49 total).
- Re-run after fixes: tuned unchanged (19/20, 16/20); held-out post-change service 10/12 (h06 typo flipped), task 4/12, hazards 12/12. Both runs reported; blind run stays the headline.
- Demo phrase checks (laptop, `eval/demo.json`, `eval/demo-spark.json`): "May tulo sa ilalim ng lababo namin" → leak, no hazard ✅; "Nag-spark yung saksakan nung sinaksak ko yung charger" (and 3 other spark variants) → outlet + SPARKING ✅; "Umaapaw na yung tubig sa CR, barado yung inidoro" → clog + flooding ✅; "Amoy gas dito sa kusina, ano gagawin ko?" → gas ✅; "Sira yung pinto ng CR, ayaw na sumara" → door ✅. Not reliable: "nag-spark… namatay yung electric fan" → breaker; "breaker… aircon at plantsa" → inspect.

### 2.22 Two-step intake experiment (Oct 10, branch `ai/two-step`, based on `ai/demo-fixes` e511df5)
- Problem: the model picks the service well but the exact task poorly (held-out task 4/12).
- Built behind a flag, **default unchanged (single-step)**: `runIntake(text, llm, catalog, { twoStep })`.
  - Step 1 = the existing intake call, prompt and schema byte-identical (on-phone warm-up still applies).
  - Step 2 (`chooseTask`): one extra call, JSON schema = only the chosen service's 4 codes, `maxTokens` 20, no retry. A valid code overrides the step-1 task; invalid/throwing output keeps the step-1 task (then `normalizeIntake` turns a wrong-service task into `<SERVICE>_INSPECT`). Keyword fallback, hazard rules and `normalizeIntake` untouched; step 2 only runs when step 1 succeeded.
  - Two variants: `"compact"` (or `true`): short separate prompt with just the 4 tasks + plain Taglish/English descriptions (`taskChoiceHints` in `prompts.ts`); `"followup"`: continues the step-1 conversation (intake messages + step-1 answer + a follow-up question), so the intake prefix stays in the phone's KV cache.
- Eval: `npm run eval -- ... --two-step [compact|followup]`; results saved as `eval/results/qwen3_1.7b.ab-<set>[.twostep-<mode>].json`. Rows now include per-call Ollama token counts.
- Tuning: one round on the tuned set + demo files only (compact first run: tuned 18/20, demo 5/6 with d03 "barado yung inidoro" → toilet repair; then clarified the PLUMB_LEAK_SINK / PLUMB_CLOG / PLUMB_TOILET_REPAIR descriptions). Held-out was run only after that, once per mode, no changes after. Caveat: held-out failures were already described in 2.16, so the held-out numbers below are **"already seen"**, not blind.
- Results (laptop, Ollama, qwen3:1.7b, temperature 0):

| Set | Mode | Service | Task | Hazards | Avg latency |
| --- | --- | --- | --- | --- | --- |
| Tuned (20) | single | 19/20 | 16/20 | 19/20 | 0.98 s |
| Tuned (20) | two-step compact | 19/20 | **19/20** | 19/20 | 1.76 s |
| Tuned (20) | two-step followup | 19/20 | 15/20 | 19/20 | 2.82 s |
| Held-out (12, already seen) | single | 10/12 | 4/12 | 12/12 | 0.98 s |
| Held-out (12, already seen) | two-step compact | 10/12 | 5/12 | 12/12 | 3.47 s* |
| Held-out (12, already seen) | two-step followup | 10/12 | 5/12 | 12/12 | 1.48 s |
| demo.json (6) | single | 6/6 | 4/6 | 6/6 | 0.99 s |
| demo.json (6) | two-step compact | 6/6 | **6/6** | 6/6 | 1.70 s |
| demo.json (6) | two-step followup | 6/6 | 6/6 | 6/6 | 1.42 s |
| demo-spark.json (4) | single | 4/4 | 4/4 | 4/4 | 1.01 s |
| demo-spark.json (4) | two-step compact | 4/4 | 4/4 | 4/4 | 1.47 s |
| demo-spark.json (4) | two-step followup | 4/4 | 4/4 | 4/4 | 1.37 s |

  \* averages include the first call (model load/cache), so laptop averages are noisy; the step-2 call itself measured ~0.19–0.25 s (compact) and ~0.45–0.50 s (followup) on the laptop.
- Per case: compact fixes tuned i03 (toilet tank), i09 (no power → inspect), i15 (warm air → not cold) and demo d02 (spark + fan died → outlet), d06 (breaker + aircon/plantsa → breaker); remaining tuned miss i19 is a service error (tank stand → plumbing), which step 2 cannot fix. Held-out: compact fixes h08 but changes h02 from one wrong task to another; followup fixes h08, breaks nothing new on held-out but **regresses tuned** (i05, i07, i20 newly wrong: it anchors on its own step-1 answer and the long context). Followup is not worth it.
- **Phone latency estimate** (Infinix: ~9 tok/s generation; prompt processing ≈ 1,390-token intake prompt in 23.5 s warm-up ≈ 60 tok/s):
  - Compact step 2: ~265–285 prompt tokens, **not cached** (prompt differs from the intake prefix) ≈ 4.5–5 s + ~12 output tokens ≈ 1.3 s → **+~6 s per intake (~8 s → ~14 s)**. Worse: it replaces the cached intake prefix, so the **next** intake re-processes the full ~1,390-token prompt (+~23 s) unless the intake prewarm runs again first (it does when "Ano ang problema?" opens, but not between first-aid chat turns).
  - Followup step 2: new tokens ≈ step-1 answer (~55) + question (~220) ≈ 275 → also **+~6 s**, but the intake prefix stays cached. (Ollama's `prompt_eval_count` reports the full prompt even when cached, so phone numbers are estimates from token counts, not measurements.)
  - Prewarming step 2 is not useful: the compact prompt depends on the service chosen in step 1, and llama.cpp keeps one prefix, so prewarming it would evict the intake prefix. Not added to `LlamaService`.
- Recommendation: **keep single-step as the default on the phone** (+~6 s ≈ +75% latency for +1/12 on the already-seen held-out set). Compact two-step is a clear win on the tuned/demo sets and nearly free on a laptop (~0.2 s), so it is a candidate for Edge/Ollama mode. Decide after the fresh held-out set (`eval/heldout2.json`, not written yet at the time of this run).
- Tests: `packages/shared/test/twostep.test.ts` (10 tests: off by default; step 2 gets only the service's 4 codes; compact prompt has no other service's codes; followup keeps the step-1 messages as an exact prefix; invalid / other-service / throwing step 2 falls back; keyword fallback path unchanged; hazard rules still apply). 59 tests pass, typecheck clean.

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
| Mobile app (Expo + NativeWind + llama.rn) | ✅ real client + worker screens (`swe/core-flow`) |
| API (Express + Prisma) | ✅ code done; ⏳ not run against Supabase |
| CI | ✅ |
| Design artboard + DESIGN/FLOWS docs | ✅ |
| Dev build on phone (Infinix X6873, Android 16, ~8 GB RAM) | ✅ installs and opens |
| Model on phone + measured latency | ⏳ waiting on dev build |
| Real screens, outbox/sync | ✅ offline book → sync and offline report → sync verified on the phone |
| Held-out eval set | ⏳ SWE writes, AI runs once |
| README for judges, videos, X/LinkedIn post, submission | ⏳ |

## 4. Open decisions
1. Urgency lock: client can't lower urgency below a hazard's floor (design default). Confirm.
2. Booking detail: filter `GET /bookings/mine` or add `GET /bookings/:id`.
3. Copy: "Cash on completion" vs "Cash pagkatapos ng trabaho".
4. API hosting for Demo Day: laptop on personal hotspot (recommended) or Render.
5. Optional: Qwen3 4B only if 1.7B is fast on the phone (~8 GB physical RAM; the "16 GB" figure counted Infinix virtual RAM).

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
- **Oct 9:** `swe/core-flow`: real screens, SQLite outbox + sync engine, initial Prisma migration, end-to-end offline demo flow verified on the phone.
