# TrabaWho — ARCHITECTURE.md (Hackathon MVP, 2-person scope)

**Version:** 0.2 · Companion to `SPEC.md`
**Team:** **AI Engineer (AI)** and **Software Engineer (SWE)**.
Items marked **(verify)** must be tested in the first hours. Library APIs change quickly, so check versions before building on them.

---

## 1. Overview

```
┌──────────────────────── Android phone ────────────────────────┐
│  React Native app (Expo dev build)                            │
│                                                               │
│  UI (Phosphor icons) ──► Feature modules                      │
│                           ├─ Intake ─┐                        │
│                           └─ Report ─┴─► AI Service (local)   │
│                                           └─ llama.rn (LLM)   │
│                                                               │
│  Bundled: catalog.json  ──► Rules engine (urgency, price)     │
│                                                               │
│  Local data (expo-sqlite)                                     │
│   ├─ bookings_cache                                           │
│   └─ outbox (pending creates)  ──► Sync Engine ──┐            │
└──────────────────────────────────────────────────┼────────────┘
                                                   │ HTTPS (when online)
                                    ┌──────────────▼─────────────┐
                                    │ API: Node.js + Express      │
                                    │      + Prisma               │
                                    └──────────────┬─────────────┘
                                                   │
                                    ┌──────────────▼─────────────┐
                                    │ Supabase Postgres           │
                                    └────────────────────────────┘
```

**Principle:** every AI call happens on the phone. The server never sees raw problem descriptions. It only receives the finished booking and job report. No cloud AI API is used anywhere.

## 2. Tech stack

| Layer          | Choice                                          | Owner |
| -------------- | ----------------------------------------------- | ----- |
| Mobile         | React Native + Expo (dev build), TypeScript     | SWE   |
| Navigation     | Expo Router                                     | SWE   |
| On-device LLM  | **llama.rn** + GGUF model (Q4)                  | AI    |
| Validation     | **Zod** (shared schemas in `packages/shared`)   | AI    |
| Rules engine   | Plain TS (urgency floors, pricing, safety)      | AI    |
| Local storage  | **expo-sqlite**                                 | SWE   |
| Network status | @react-native-community/netinfo                 | SWE   |
| Icons          | phosphor-react-native (+ react-native-svg)      | SWE   |
| API            | Node.js + Express + Prisma                      | SWE   |
| Database       | Supabase Postgres                               | SWE   |
| Hosting (API)  | Team laptop on venue network, or Render/Railway | SWE   |

**Dropped vs v0.1:** whisper.rn (voice), MiniSearch (Ask-the-Guide), Supabase Auth, catalog sync endpoint.

**Setup pitfall:** llama.rn is a native module, so it **does not work in Expo Go**. Use a development build (`npx expo prebuild` + `npx expo run:android`, or an EAS dev build). SWE starts this at hour 0. It is the biggest technical risk.

## 3. On-device AI (AI Engineer)

### 3.1 Model (verify on the demo phone)

| Purpose                         | Candidate                                                                                   | Approx. size |
| ------------------------------- | ------------------------------------------------------------------------------------------- | ------------ |
| Intake + report extraction      | Small instruct model, 1–2B, Q4 GGUF (e.g., Qwen3 1.7B, Gemma small instruct, Llama 3.2 1B)  | ~0.8–1.3 GB  |

One model, loaded once at app start (warm-up) to avoid a slow first answer. Model file is pushed to the phone with adb.

**Fallback if the phone is too slow: Edge mode.** Run the same model in Ollama on a laptop and point the AI Service at it over a local hotspot with no internet. Still local, no cloud, but disclose it as laptop-local.

**Faster model iteration:** run prompts and the eval script on a laptop (llama.cpp / Ollama, same GGUF) while the dev build is not ready. Re-run on the phone once it is.

### 3.2 AI Service interface (the contract between AI and SWE)

**Implemented** in `packages/shared/src/ai/AIService.ts`. SWE builds screens against a **stub** that returns hardcoded results until the real one lands.

```ts
import type { AIService, BookingCardData, ReportDraft, TaskCode } from "@trabawho/shared";

interface AIService {
  init(): Promise<void>;                                                // load + warm up model
  readonly modelId: string;                                             // e.g. "qwen3-1.7b-q4"
  intake(text: string): Promise<BookingCardData | null>;                // null = show service picker
  extractReport(text: string, bookingTask: TaskCode): Promise<ReportDraft>;
}
```

Every backend implements `intake` as `runIntake(text, llmCall)` from `packages/shared/src/ai/pipeline.ts`, so prompts, retries, keyword fallback and rules are identical on phone, laptop (Edge mode) and in the eval. A backend only supplies `LlmCall = ({ messages, jsonSchema, maxTokens }) => Promise<string>`.

Types, Zod schemas, catalog, rules engine and prompts all live in `packages/shared`, so the API validates and prices with the same code.

### 3.3 Intake pipeline

```
client text
   │
   ▼
[1] Prompt: system rules + compact catalog (task code + short description, ~20 lines)
            + 4–6 few-shot Taglish examples
   ▼
[2] LLM call: temperature 0, max ~150 tokens, JSON-schema / grammar-constrained (verify)
   ▼
[3] Zod validate ── fail ──► retry once ── fail ──► keyword fallback
   │                                                ("tulo", "gripo" → PLUMBING_INSPECT)
   ▼
[4] Rules engine (no AI): urgency floors, price/duration from catalog,
    safety notes from hazards, follow-up questions from task
   ▼
BookingCardData
```

The model only **chooses** codes and writes a one-line summary. All safety text, questions and prices come from the catalog.

### 3.4 Report pipeline

Same pattern: constrained JSON (`tasksDone` enum, `materials[]`, `durationMinutes`, `notes`) → Zod → worker edits in a form → **code** computes totals from worker-entered prices.

## 4. Offline-first data and sync (SWE)

### 4.1 Local SQLite tables

| Table            | Contents                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `bookings_cache` | the user's recent bookings (offline viewing, worker reports)                                                                             |
| `outbox`         | `{ id (uuid), type: 'BOOKING_CREATE' \| 'REPORT_CREATE', payload (json), status: 'pending' \| 'sent' \| 'failed', attempts, createdAt }` |

The catalog is read directly from the bundled `catalog.json`; no SQLite tables for it.

### 4.2 Sync engine

- On every create, write to `outbox` **first**, then try to send if online.
- On reconnect (NetInfo) and app foreground, flush the outbox in order.
- **Idempotency:** each item carries a client-generated UUID (`clientRef`). The API has a unique constraint on it, so retries never duplicate.
- Server recomputes the price range from its copy of the catalog.

### 4.3 What each screen does offline

| Screen                     | Offline behavior                                  |
| -------------------------- | ------------------------------------------------- |
| New problem → Booking Card | Fully works                                       |
| Book                       | Saved as Pending (outbox)                         |
| My bookings                | Cached list + pending items                       |
| Worker job list            | Cached accepted jobs; can't accept new ones       |
| Job report                 | Fully works; saved to outbox                      |
| Account switcher           | Works (seeded user list bundled or cached)        |

## 5. Data model (Prisma)

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // Supabase pooled connection (port 6543, ?pgbouncer=true)
  directUrl = env("DIRECT_URL")     // Supabase direct connection (port 5432), for migrations
}

generator client {
  provider = "prisma-client-js"
}

enum Role          { CLIENT WORKER }
enum Urgency       { EMERGENCY TODAY SCHEDULED }
enum BookingStatus { REQUESTED ACCEPTED IN_PROGRESS COMPLETED CANCELLED }

model User {
  id              String    @id @default(uuid())
  role            Role
  name            String
  phone           String
  services        String[]  // workers only: service codes
  city            String
  barangay        String
  isVerified      Boolean   @default(false)
  createdAt       DateTime  @default(now())
  clientBookings  Booking[] @relation("ClientBookings")
  workerBookings  Booking[] @relation("WorkerBookings")
}

model Booking {
  id             String        @id @default(uuid())
  clientRef      String        @unique      // client-generated UUID for idempotent sync
  clientId       String
  client         User          @relation("ClientBookings", fields: [clientId], references: [id])
  workerId       String?
  worker         User?         @relation("WorkerBookings", fields: [workerId], references: [id])
  serviceCode    String
  taskCode       String
  urgency        Urgency
  hazards        String[]
  aiSummary      String
  aiConfidence   String
  aiModel        String                     // e.g. "qwen3-1.7b-q4"
  editedByUser   Boolean       @default(false)
  address        String
  city           String
  barangay       String
  priceMin       Int
  priceMax       Int
  status         BookingStatus @default(REQUESTED)
  createdOffline Boolean       @default(false)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  report         JobReport?
}

model JobReport {
  id              String   @id @default(uuid())
  clientRef       String   @unique
  bookingId       String   @unique
  booking         Booking  @relation(fields: [bookingId], references: [id])
  tasksDone       String[]
  materials       Json     // [{ name, qty, unit, unitPrice }]
  durationMinutes Int
  notes           String
  laborCost       Int
  materialsCost   Int
  total           Int
  createdOffline  Boolean  @default(false)
  createdAt       DateTime @default(now())
}
```

**Notes**

- `WorkerProfile` merged into `User` to save time.
- Raw client description is **not** stored on the server, only the approved AI summary.
- Money is whole pesos (`Int`).

## 6. API (Express, SWE)

Demo auth: every route except `/health` and `/users` reads `x-user-id` and loads that `User`. Clearly labeled demo-only in the README.

| Method | Path                   | Who           | Purpose                                                       |
| ------ | ---------------------- | ------------- | ------------------------------------------------------------- |
| GET    | `/health`              | any           | Online check                                                  |
| GET    | `/users`               | any           | Seeded users for the account switcher                         |
| POST   | `/bookings`            | client        | Create (idempotent on `clientRef`); server recomputes price   |
| GET    | `/bookings/mine`       | client/worker | My bookings                                                   |
| GET    | `/bookings/open`       | worker        | `REQUESTED` bookings matching my services + city              |
| POST   | `/bookings/:id/accept` | worker        | First-accept-wins                                             |
| POST   | `/bookings/:id/start`  | worker        | → `IN_PROGRESS`                                               |
| POST   | `/bookings/:id/report` | worker        | Create report (idempotent on `clientRef`) → `COMPLETED`       |

**First-accept-wins:**

```ts
const result = await prisma.booking.updateMany({
  where: { id, status: "REQUESTED", workerId: null },
  data: { status: "ACCEPTED", workerId: me.id },
});
if (result.count === 0) return res.status(409).json({ error: "Already taken" });
```

## 7. Repository layout

```
trabawho/
├─ apps/
│  ├─ mobile/                 # Expo app (SWE, except src/ai + src/rules)
│  │  ├─ app/
│  │  │  ├─ login.tsx                       # account switcher
│  │  │  ├─ (client)/new-problem.tsx, booking-card.tsx, bookings.tsx
│  │  │  └─ (worker)/jobs.tsx, job/[id].tsx, report.tsx
│  │  ├─ src/ai/              # LlamaService / OllamaService / StubService (thin LlmCall wrappers)
│  │  └─ src/data/            # sqlite, outbox, sync engine (SWE)
│  └─ api/                    # Express + Prisma (SWE)
│     ├─ prisma/schema.prisma
│     ├─ prisma/seed.ts       # 1–2 clients + ~10 workers
│     └─ src/routes/
├─ packages/
│  └─ shared/                 # catalog.json, Zod schemas, rules engine, prompts, AI pipeline (AI)
├─ eval/                      # intake.json, report.json, run-eval script (AI)
├─ docs/SPEC.md, docs/ARCHITECTURE.md
└─ README.md                  # setup, recreate steps, disclosures, eval results
```

## 8. Team split

| Person                   | Owns                                                                                                                                                         | First milestone                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| **AI Engineer**          | Model choice, llama.rn integration, prompts, AIService, Zod schemas, keyword fallback, rules engine, `catalog.json`, eval sets + script, Edge-mode fallback  | Hour 3: model returns valid intake JSON (laptop first, then phone) |
| **Software Engineer**    | Expo dev build, all screens, SQLite outbox + sync, Express + Prisma + Supabase, seed, API hosting, demo video recording                                      | Hour 3: dev build on phone with stub AIService + navigation |

**Shared:** README, pitch slides, final demo rehearsal.

**Handoff points**

1. **Hour 0:** agree on `AIService` interface and `packages/shared` types. SWE uses a stub.
2. **Hour 3–6:** AI drops llama.rn into the dev build; SWE swaps stub for real service.
3. **Hour 8:** both test intake offline end-to-end on the phone.

**Checkpoints:** hour 8 = intake works offline end-to-end; hour 14 = online booking + offline report + sync; hour 18 = feature freeze, polish and bug fixes only; hour 20 = demo video recorded; **10:00 AM = submission (no extensions)**.

## 9. Risks and mitigations

| Risk                                       | Mitigation                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Native build (Expo dev build) eats hours   | SWE starts at hour 0; keep a working APK at all times                                       |
| Only 2 people, one gets blocked            | Stub AIService decouples the two; AI iterates prompts on laptop while the build isn't ready |
| Model too slow or too dumb on phone        | Smaller model; shorter prompt; Edge mode (Ollama on laptop via hotspot), disclosed          |
| Wrong service/task picked                  | Client can edit; `_INSPECT` fallback; keyword fallback; report real eval numbers            |
| Bad safety advice                          | All safety text pre-written; hazard rules in code; GAS_SMELL always shows 911               |
| Demo-day Wi-Fi unreliable                  | The offline part is the demo; online steps have a recorded backup clip                      |
| Supabase pooled connection issues          | Pooled `DATABASE_URL` with `?pgbouncer=true` at runtime, `DIRECT_URL` for migrations        |
| Running out of time                        | Cut order: polling polish → report editing UI → online accept flow (fake with seed status)  |

## 10. Verify in the first 3 hours

| # | Check                                                                 | Owner |
| - | --------------------------------------------------------------------- | ----- |
| 1 | Two candidate GGUF models: accuracy on 20 intake cases (laptop)       | AI    |
| 2 | JSON-constrained output works in the installed llama.rn version        | AI    |
| 3 | Expo dev build installs and runs on the phone                         | SWE   |
| 4 | llama.rn loads the chosen model on the phone; measure load + latency  | AI + SWE |
| 5 | Prisma connects to Supabase (pooled + direct) and migrations run      | SWE   |
