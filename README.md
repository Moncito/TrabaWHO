# TrabaWho

**On-device AI for booking blue-collar home services in the Philippines, built to keep working when the signal doesn't.**

TrabaWho is a Grab-style booking app for plumbers, electricians, carpenters, aircon technicians and welders. A client describes the problem in their own Taglish ("Ayaw gumana ng saksakan sa kusina, nag-spark kanina"), and a **language model running on the phone** turns it into a bookable job: the right service, task, urgency, hazards and a short summary. Workers dictate what they did after a job, and the same on-device model turns it into an itemized report. **All AI runs on the phone, in airplane mode.** Bookings and reports queue offline and sync when the connection comes back.

> AppBuildersPH Hackathon 2026 · Theme: **Local AI** · "Build an AI product that remains genuinely useful when the cloud disappears."

---

## Why local AI?

Home-repair problems happen where signal fails: a sparking outlet during a brownout, a leak at night with no load, a worker inside a basement or ceiling. TrabaWho's AI runs entirely on the user's phone. It turns a messy Taglish description into a bookable job and writes the worker's job report **without data, at no load cost, and without sending descriptions or photos of the inside of someone's home to a server**. Only the booking the client approved and the finished report are synced when the connection returns.

## What runs locally vs what needs internet

| Runs on the phone (works in airplane mode) | Needs internet |
| --- | --- |
| Job intake: Taglish text → service, task, urgency, hazards, summary (LLM) | Sending / syncing bookings and reports |
| Job report: worker's text → tasks, materials, quantities, duration (LLM) | Worker matching and accepting jobs |
| Price and duration estimates (bundled catalog) | Booking status updates |
| Safety notes for hazards (pre-written, never AI-generated) | First-time install of the app and model |
| Keyword fallback if the model fails | |
| Offline booking / report queue | |

**No cloud AI API is used anywhere.**

## How the AI works

```
client text ─► prompt (catalog of task codes + Taglish few-shot examples)
            ─► Qwen3 1.7B on the phone (llama.rn), JSON-schema constrained output
            ─► Zod validation ─► retry once ─► keyword fallback if still invalid
            ─► rules engine (plain code): urgency floors from hazards, price/duration
               from the catalog, pre-written safety notes, follow-up questions
            ─► Booking Card (client can edit before booking)
```

Design rules that keep a 1.7B model safe and useful:
- **The model only chooses; code decides.** The model picks codes from a fixed list and writes a one-line summary. Prices, durations, safety text and questions come from a bundled catalog.
- **Safety can't depend on the model.** Hazard keywords in the original text are always checked by code. A gas smell always shows the evacuation note and 911, whatever the model returns.
- **Code does the arithmetic.** Report durations ("isang oras at kalahati" = 90 min) and totals are computed by code; the worker types material prices, never the AI.
- **The same pipeline everywhere.** Phone (llama.rn), laptop (Ollama) and the eval script share one code path in `packages/shared`.

## Results (real numbers, see `eval/`)

Model: **Qwen3 1.7B, Q4_K_M GGUF**. Laptop numbers via Ollama 0.40.1; phone numbers come from the in-app AI stats screen.

**Tuned set** (`eval/intake.json`, 20 cases; `eval/report.json`, 5 cases):

| Metric | Qwen3 1.7B (local) | Keyword rules only |
| --- | --- | --- |
| Intake: correct service | 19/20 | 19/20 |
| Intake: correct task | 16/20 | 16/20 |
| Intake: hazards detected | 19/20 | 19/20 |
| Report: materials extracted | 4/7 | 0/7 |
| Report: correct duration (parsed by code in both) | 5/5 | 5/5 |
| Avg intake latency (laptop) | ~0.7–1.0 s | ~0 ms |

**Held-out set** (`eval/heldout.json`, written by a teammate who had not seen the eval set or prompts; run once, no tuning afterwards):

| Metric | Qwen3 1.7B (local) | Keyword rules only |
| --- | --- | --- |
| Intake: correct service | _pending_ | _pending_ |
| Intake: correct task | _pending_ | _pending_ |

**On the phone** (demo device, 16 GB RAM):

| Metric | Value |
| --- | --- |
| Model load + warm-up | _pending_ |
| Avg intake answer | _pending_ |
| Tokens / second | _pending_ |

Honesty notes:
- Prompts were tuned while looking at `intake.json`, so those numbers are optimistic. The held-out numbers are the fair ones.
- On the tuned set the model and the keyword rules tie on task accuracy but miss **different** cases. Only the model extracts materials and writes summaries, and it is meant to handle phrasing nobody wrote a keyword for.
- Gemma 3 1B was also evaluated (service 17/20, task 9/20) and rejected.
- Reproduce any number with the commands below; raw outputs are in `eval/results/`.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Mobile | React Native 0.86 + Expo SDK 57 (dev build), Expo Router, TypeScript |
| On-device LLM | llama.rn 0.12.9 (llama.cpp) + Qwen3 1.7B Q4_K_M GGUF |
| Styling / UI | NativeWind 4 + Tailwind 3, Reanimated 4, Phosphor icons, Anton + Archivo fonts |
| Local data | expo-sqlite, NetInfo (offline queue + sync on reconnect) |
| Validation | Zod (shared between app, API and eval) |
| API | Node.js, Express 5, Prisma 6 |
| Database | Supabase Postgres |
| Eval / laptop model | Ollama (same GGUF), Vitest |

## Repository layout

```
apps/mobile        Expo app (screens, AI services: llama.rn / Ollama / stub, offline queue)
apps/api           Express + Prisma API (bookings, first-accept-wins, reports)
packages/shared    Catalog, Zod schemas, rules engine, prompts, AI pipeline (used by app, API, eval)
eval               Test sets, eval runner, saved results
docs               SPEC, ARCHITECTURE, TASKS, DESIGN, FLOWS, SETUP, PROGRESS
```

## Run it yourself

Requirements: Node 22, Git. For the phone: Android Studio (SDK + `adb`) and an Android phone with USB debugging (6 GB RAM or more). For the laptop model: [Ollama](https://ollama.com).

```bash
git clone https://github.com/Moncito/TrabaWHO.git
cd TrabaWHO
npm install
npm test                 # unit tests: rules, pipeline, eval data
```

### 1. Reproduce the AI numbers (laptop, no phone needed)

```bash
ollama pull qwen3:1.7b
npm run eval -- --backend ollama --model qwen3:1.7b
npm run eval -- --backend keywords        # baseline without the model
```

### 2. Try the app without a phone build (keyword AI only)

```bash
cd apps/mobile
cp .env.example .env     # EXPO_PUBLIC_AI_BACKEND=stub
npx expo start --web
```

### 3. Run the API

```bash
cd apps/api
cp .env.example .env     # fill in Supabase DATABASE_URL and DIRECT_URL
npx prisma migrate dev --name init
npm run db:seed
npm run dev              # http://0.0.0.0:3000
```

### 4. On-device AI on an Android phone

```bash
cd apps/mobile
npx expo prebuild --platform android
npx expo run:android                     # installs the dev build
```

Get the model file (either way gives the same Q4_K_M GGUF):
- Download `Qwen3-1.7B-Q4_K_M.gguf` from https://huggingface.co/unsloth/Qwen3-1.7B-GGUF, or
- Copy Ollama's local blob after `ollama pull qwen3:1.7b` (see `docs/SETUP.md` section 5.2).

```bash
adb shell mkdir -p /sdcard/Android/data/ph.trabawho.app/files
adb push qwen3-1.7b-q4_k_m.gguf /sdcard/Android/data/ph.trabawho.app/files/model.gguf
```

Set `EXPO_PUBLIC_AI_BACKEND=llama` in `apps/mobile/.env`, restart with `npx expo start -c`, and turn on airplane mode. The **AI stats** screen shows model load time, latency and tokens/s measured on the phone.

Full setup details: [`docs/SETUP.md`](docs/SETUP.md).

### Demo accounts

Seeded users (Quezon City): clients Juan dela Cruz and Maria Santos; 10 workers across all five services. The app has an account switcher instead of sign-up.

> **Demo-only auth:** the app sends the selected user's id in an `x-user-id` header. Anyone can act as anyone. This is for the hackathon demo only.

---

## Disclosures

| Item | Answer |
| --- | --- |
| Models | Qwen3 1.7B Q4_K_M GGUF (via llama.rn on the phone; via Ollama on a laptop for evaluation and an optional laptop fallback). Gemma 3 1B evaluated, not used |
| Frameworks / tools | React Native, Expo, Expo Router, NativeWind, Tailwind, Reanimated, llama.rn / llama.cpp, expo-sqlite, NetInfo, Zod, Node.js, Express, Prisma, Vitest, Ollama, Phosphor Icons |
| APIs / cloud services | Supabase Postgres (booking/report sync only). **No cloud AI API** |
| Existing code / assets | Expo `create-expo-app` template; Google Fonts (Anton, Archivo); Phosphor icons; a capstone topic proposal (planning document only, no code). Catalog, prompts, safety text, eval sets and all app code were written during the hackathon |
| AI development tools | Claude Code |
| Prices | Price ranges in the catalog are **illustrative**, not sourced market rates |

## Team

- Moncito: AI Engineer (model, prompts, AI pipeline, eval)
- _Teammate name_: Software Engineer (mobile app, API, offline sync)

Built for the AppBuildersPH Hackathon 2026.
