# TrabaWho — SETUP.md (start here)

**For:** both of us (AI Engineer + Software Engineer). **Deadline:** submission 10:00 AM.
Read this first, then `TASKS.md` for your checklist.

| Doc | What it is |
| --- | --- |
| [SPEC.md](SPEC.md) | What we're building, MVP scope, demo script |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Tech stack, AI pipeline, data model, API |
| [TASKS.md](TASKS.md) | Full task list per person, timeline, CI, submission checklist |
| [DESIGN.md](DESIGN.md) | Design tokens, fonts, icons, UI components, animations |
| [FLOWS.md](FLOWS.md) | Route map, navigation flows, booking state machine, sync sequence |
| [Design artboard](https://claude.ai/artifact/Ksz7G7dpk9nNyxshbVjVdG) | Every screen mocked up (client, worker, system states) |

---

## 1. What's already done

| Area | Status |
| --- | --- |
| Monorepo (npm workspaces) | Done: `apps/mobile`, `apps/api`, `packages/shared`, `eval` |
| Shared types (Zod) | Done: AI outputs, Booking Card, API payloads |
| Catalog | Done: 5 services, 20 tasks, 6 hazards, Taglish safety notes. **Prices are illustrative.** |
| Rules engine | Done + tested: urgency floors, pricing, safety notes, keyword fallback |
| AI pipeline | Done + tested: prompt → LLM → Zod → retry → keyword fallback → rules |
| Prompts | Done: intake (6 few-shot) and report (2 few-shot), JSON-schema constrained |
| Eval | Done: 20 intake + 5 report cases, runner for Ollama / llama.cpp / keywords |
| Mobile app | Scaffolded: Expo SDK 57, Expo Router, NativeWind, fonts, stub screens, AI services. Android JS bundle builds. |
| API | Done (untested against DB): Express 5 + Prisma 6, all 8 routes, demo auth, seed (2 clients, 10 workers) |
| CI | Done: typecheck, tests, catalog check, keyword eval, Prisma validate, Android bundle |
| Not done | Supabase project, model download, dev build on phone, real screens, outbox/sync |

**Current numbers (Qwen3 1.7B via Ollama on the laptop, Oct 9):**

| Set | Result | Avg latency (laptop) |
| --- | --- | --- |
| Intake (20) | service 19/20 · task 16/20 · hazards 19/20 | ~0.7 s (first call ~13 s: model load) |
| Report (5) | tasks 5/5 · materials 4/7 · duration 5/5 | ~1.1 s |

**Model decision: Qwen3 1.7B.** Gemma 3 1B (same prompt) scored service 17/20, task 9/20, materials 3/7, ~1.2 s avg: worse and not faster.

History: first prompt scored task 10/20. Grouping tasks by service with Taglish hints → 16/20. Report durations are now parsed by code (`parseDurationMinutes`), not the model.

**Honesty caveat:** prompts were tuned while looking at these same 20 cases. Before the pitch, write **10 new held-out cases** (ideally by the SWE, who hasn't seen the prompt), run them once, and report those numbers too. Phone latency will be slower than laptop; measure it on the demo phone.

## 2. Stack (installed versions)

| Layer | Package | Version |
| --- | --- | --- |
| Mobile | expo / react-native / react | 57 / 0.86 / 19.2 |
| Navigation | expo-router | 57 |
| Styling | nativewind + tailwindcss | 4.2.7 + 3.4 (NativeWind 4 needs Tailwind 3) |
| Animation | react-native-reanimated + worklets | 4.5 (from Expo template) |
| On-device LLM | llama.rn | 0.12.9 (latest stable; 0.13 is RC) |
| Local DB | expo-sqlite | 57 |
| Network status | @react-native-community/netinfo | 12 |
| Icons | phosphor-react-native + react-native-svg | 3.0 + 15 |
| Fonts | @expo-google-fonts/anton (headline) + archivo (body) | — |
| UUID | expo-crypto (`randomUUID()`) | 57 |
| Validation | zod | 3.25 |
| API | express + cors | 5.2 |
| ORM | prisma + @prisma/client | 6.19.3 (Prisma 7 changed the config; not worth it today) |
| DB | Supabase Postgres | — |
| Tests | vitest | 3.2 |

**Fonts:** Impact is a Microsoft font and can't be bundled in the APK. The app uses **Anton** (free look-alike) for headlines and **Archivo** for body. Use real Impact only in slides.

## 3. Repo structure

```
TrabaWHO/
├─ .github/workflows/ci.yml        # CI (section 7)
├─ package.json                    # npm workspaces + root scripts
├─ tsconfig.base.json
├─ docs/                           # SPEC, ARCHITECTURE, TASKS, DESIGN, FLOWS, SETUP
├─ packages/shared/                # (AI) used by mobile, API and eval
│  ├─ catalog.json                 # services, tasks, prices, hazards, safety notes
│  ├─ scripts/validate-catalog.ts
│  ├─ src/
│  │  ├─ schemas.ts                # Zod: IntakeResult, ReportDraft, BookingCardData, BookingCreate, ReportCreate
│  │  ├─ catalog.ts                # typed catalog + validateCatalog()
│  │  ├─ rules/                    # urgency, pricing, safety, fallback, bookingCard
│  │  └─ ai/                       # AIService interface, prompts, JSON schemas, pipeline
│  └─ test/                        # vitest: rules, pipeline, eval data
├─ eval/                           # (AI)
│  ├─ intake.json, report.json     # test sets
│  ├─ run-eval.ts                  # npm run eval -- --backend ollama --model qwen3:1.7b
│  └─ results/                     # commit these; CI doesn't run the model
├─ apps/mobile/                    # (SWE) Expo app
│  ├─ app.json                     # package: ph.trabawho.app
│  ├─ tailwind.config.js           # brand colors + fonts
│  ├─ babel.config.js, metro.config.js, nativewind-env.d.ts
│  ├─ .env.example                 # AI backend + API URL
│  └─ src/
│     ├─ global.css
│     ├─ app/                      # Expo Router screens
│     │  ├─ _layout.tsx            # fonts + Stack
│     │  ├─ index.tsx              # -> /login
│     │  ├─ login.tsx              # account switcher
│     │  ├─ (client)/new-problem.tsx, booking-card.tsx, bookings.tsx
│     │  └─ (worker)/jobs.tsx, job/[id].tsx, report.tsx
│     ├─ ai/                       # StubService, LlamaService, OllamaService, index.ts (picks one)
│     ├─ components/Screen.tsx     # placeholder shell
│     └─ state/draft.ts            # Booking Card between screens
└─ apps/api/                       # (SWE) Express + Prisma
   ├─ .env.example                 # DATABASE_URL, DIRECT_URL, PORT
   ├─ prisma/schema.prisma, seed.ts
   └─ src/index.ts, auth.ts, db.ts, routes/bookings.ts
```

## 4. First-time setup (both)

Prerequisites: **Node 22**, **Git**, **Android Studio** (SDK + platform tools for `adb`; needed for the dev build), a USB cable, and USB debugging enabled on the phone.

```bash
git clone <repo-url> TrabaWHO
cd TrabaWHO
npm install
npm test                      # 27 tests should pass
npm run typecheck
```

## 5. AI Engineer setup

### 5.1 Laptop model (Ollama), for prompt work + eval

1. Install Ollama (`winget install Ollama.Ollama`). It starts a background server automatically.
   If `ollama serve` says *"Only one usage of each socket address"*, that just means it's already running.
2. Pull candidate models (about 1–1.5 GB each):
   ```bash
   ollama pull qwen3:1.7b
   ollama pull gemma3:1b
   ```
3. Run the eval:
   ```bash
   npm run eval -- --backend ollama --model qwen3:1.7b
   npm run eval -- --backend ollama --model gemma3:1b
   ```
   A real run shows `model` (not `fallback`) on most rows and latency in hundreds/thousands of ms.
   The script refuses to save results if the model can't be reached.
4. Fix prompts in `packages/shared/src/ai/prompts.ts`, re-run, commit `eval/results/*.json`.

### 5.2 Phone model (GGUF from Hugging Face)

The phone runs the same model as a GGUF file through llama.rn.

**Fastest: reuse Ollama's copy** (already downloaded by `ollama pull`, and it's the exact file the eval numbers came from). Ollama stores it as a plain GGUF blob (Q4_K_M, 1.27 GB):

```powershell
$m = "$env:USERPROFILE\.ollama\models"
$man = Get-Content "$m\manifests\registry.ollama.ai\library\qwen3\1.7b" -Raw | ConvertFrom-Json
$digest = ($man.layers | Where-Object mediaType -eq "application/vnd.ollama.image.model").digest
New-Item -ItemType Directory -Force models | Out-Null
Copy-Item "$m\blobs\$($digest.Replace(':','-'))" models\qwen3-1.7b-q4_k_m.gguf
```

**Or download from Hugging Face** (~1.1 GB; slow without a token):

```bash
pip install -U huggingface_hub
python -m huggingface_hub.cli.hf download unsloth/Qwen3-1.7B-GGUF Qwen3-1.7B-Q4_K_M.gguf --local-dir models
```

(Repo and file verified on Oct 9. Use `python -m ...` because pip often puts `hf.exe` in a folder that isn't on PATH. Or download in the browser: huggingface.co/unsloth/Qwen3-1.7B-GGUF → Files. `models/` and `*.gguf` are git-ignored.)

Push it to the phone **after** the app has been installed once (so its folder exists):

```bash
adb shell mkdir -p /sdcard/Android/data/ph.trabawho.app/files
adb push models/qwen3-1.7b-q4_k_m.gguf /sdcard/Android/data/ph.trabawho.app/files/model.gguf
```

Then set `EXPO_PUBLIC_AI_BACKEND=llama` in `apps/mobile/.env` and rebuild.

**Verified on the demo phone** (Infinix X6873, Android 16): `adb push` into `/sdcard/Android/data/ph.trabawho.app/files/` works.

**If `adb push` says "Permission denied"** (some phones block `Android/data`): copy the `.gguf` to the phone's **Downloads** (USB file transfer or Google Drive), open the app → **AI stats** → **Pumili ng model file (.gguf)**, pick it. The app copies it into its own storage (~1 min) and loads it. The app checks the imported copy first, then the adb path.

### 5.3 Edge-mode fallback (if the phone is too slow)

Laptop and phone on the same hotspot. Let Ollama listen on the network (`OLLAMA_HOST=0.0.0.0` as a Windows user env var, then restart Ollama), and set in `apps/mobile/.env`:

```
EXPO_PUBLIC_AI_BACKEND=ollama
EXPO_PUBLIC_OLLAMA_URL=http://<laptop-ip>:11434
```

Disclose it in the pitch as "laptop-local, no cloud".

## 6. Software Engineer setup

### 6.1 Database + API

**Option A (verified, simplest for the demo): local Postgres on the laptop.** Install PostgreSQL, create a database, and set both `DATABASE_URL` and `DIRECT_URL` in `apps/api/.env` to it (e.g. `postgresql://postgres:<pw>@localhost:5432/trabawho`). Then run steps 3–4 below. The SWE verified migrate + seed (12 users) and a full smoke test: create 201 → duplicate create returns the same id → accept 200 → second accept 409 → start 200 → report → COMPLETED, total ₱800.

**Option B: Supabase** (hosted Postgres):

1. Create a Supabase project. Copy both connection strings (Settings → Database): pooled (port 6543) and direct (5432).
2. `cp apps/api/.env.example apps/api/.env` and fill them in. **Never commit `.env`.**
3. Set `JWT_SECRET` in `.env`, create tables and run:
   ```bash
   cd apps/api
   npx prisma migrate deploy
   npm run db:seed:demo        # optional rehearsal accounts (@trabawho.test); there is no other seed data
   npm run dev                 # API on http://0.0.0.0:3000
   ```
4. Test: `curl http://localhost:3000/health`. Sign up with `POST /auth/signup` (or in the app); other routes need `Authorization: Bearer <token>`.
   `npm test -w apps/api` runs the API tests against a throwaway embedded Postgres (no Docker).

### 6.2 Mobile app

```bash
cd apps/mobile
cp .env.example .env          # set EXPO_PUBLIC_API_URL to the laptop's LAN IP
```

**UI work without a phone build (fast):** `npx expo start` → Expo Go or web. With `EXPO_PUBLIC_AI_BACKEND=stub` the AI uses the keyword fallback, so the full intake flow works without the native module.

**Dev build on the phone (needed for llama.rn, do this first, it's the biggest risk):**

```bash
npx expo prebuild --platform android
npx expo run:android          # phone plugged in, USB debugging on
```

**Troubleshooting (found on the SWE's Windows laptop):**

| Problem | Fix |
| --- | --- |
| `ninja: error: manifest 'build.ninja' still dirty after 100 tries` in `react-native-reanimated:buildCMakeDebug` | The repo is inside **OneDrive**, which keeps touching build files. Build from a folder outside OneDrive, e.g. a git worktree: `git worktree add C:\dev\trabawho-native <branch>` |
| `llama.rn` postinstall fails: `tar ... Cannot connect to C: resolve failed` | Run `npm install` from **PowerShell** (use `npm.cmd` if scripts are blocked), not Git Bash |
| Gradle can't find the Android SDK | Create `apps/mobile/android/local.properties` with `sdk.dir=C:/Users/<you>/AppData/Local/Android/Sdk` |
| Phone can't reach the API over USB | `adb reverse tcp:3000 tcp:3000`, then `EXPO_PUBLIC_API_URL=http://localhost:3000` |

Release APK for the demo phones:

```bash
cd android && ./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

## 7. CI (GitHub Actions)

`.github/workflows/ci.yml` runs on every push to `main` and every PR:

| Job | Steps |
| --- | --- |
| `check` | `npm ci` → Prisma validate + generate → typecheck (all workspaces) → tests → catalog validation → keyword-only eval |
| `android-bundle` | `expo export --platform android` (catches Metro/NativeWind/import errors without a native build) |

Not in CI: the real model eval (too slow for free runners; run locally and commit results), DB migrations (run by hand), APK build (local Gradle or EAS).

Workflow: short branches (`ai/...`, `swe/...`), PR, merge yourself when green, pull `main` often.

## 8. Everyday commands

| Command | What |
| --- | --- |
| `npm test` | All unit tests |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run validate:catalog` | Check catalog.json |
| `npm run eval -- --backend keywords` | Baseline, no model |
| `npm run eval -- --backend ollama --model <name>` | Real model eval + model-vs-keywords comparison table |
| `npm run eval -- --backend ollama --model qwen3:1.7b --intake-file heldout.json --only intake --tag heldout` | Held-out set (run once, don't tune on it) |
| `npm run dev -w @trabawho/api` | Start API |
| `npx expo start` (in apps/mobile) | Start Metro |

## 9. How the AI plugs into the app

```ts
import { ai } from "@/ai";                 // picks stub | llama | ollama from .env

const card = await ai.intake(text);        // BookingCardData | null (null = show service picker)
const draft = await ai.extractReport(text, booking.taskCode);   // ReportDraft
```

- Prices, safety notes and questions in the card come from `catalog.json`, never from the AI.
- Report totals: `computeReportTotals(tasksDone, materials)` from `@trabawho/shared`. The API recomputes them on save.
- Every API payload is validated with the shared Zod schemas (`BookingCreate`, `ReportCreate`) on both sides.

## 10. Open decisions (decide in 5 minutes, together)

1. **Model:** pick after the laptop eval (Qwen3 1.7B vs Gemma 3 1B), confirm speed on the phone.
2. **Demo phone(s):** client phone ≥ 6 GB RAM; worker can be a second phone or emulator.
3. **Headline font:** Anton in the app, Impact in slides (OK?).
4. **Urgency lock:** client can't lower urgency below a hazard's floor (sparking stays EMERGENCY). Confirm.
5. **Booking detail:** filter `GET /bookings/mine`, or add `GET /bookings/:id` (5 min of API work).
6. **Copy:** "Cash on completion" vs "Cash pagkatapos ng trabaho". Pick one.
7. **API hosting:** laptop on venue Wi-Fi/hotspot, or Render.
