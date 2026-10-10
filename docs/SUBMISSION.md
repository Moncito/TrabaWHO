# Submission answers

Copy-paste answers for the AppBuildersPH Hackathon 2026 form. Details and evidence are in the [README](../README.md).

## The proof

**Demo video:** _coming soon_

**X / LinkedIn video URL:** _coming soon_

**What runs locally** (on the phone, works in airplane mode):
- Job intake: Taglish text → service, task, urgency, hazards and summary (Qwen3 1.7B via llama.rn)
- Worker job report: text → tasks, materials with quantities, duration (same model)
- Anti-scam check of pasted SMS/chat messages (model + rules)
- First-aid "while you wait" chat: the model identifies the problem, the app shows team-written safe steps
- Price and duration estimates, safety notes and first-aid steps (bundled catalog, never AI-written)
- Keyword fallback if the model fails, and the offline booking/report queue

**What requires internet:**
- Sending and syncing bookings and reports, worker matching and accepting, status updates (to our API on the team laptop)
- First install of the app and the one-time model download (~1.1 GB from Hugging Face)

## The project

**Project name:** TrabaWHO

**Short description:** A Grab-style booking app for plumbers, electricians, carpenters, aircon technicians and welders in the Philippines. Clients describe the problem in their own Taglish and an AI model running on the phone turns it into a bookable job with the right service, urgency, safety warnings and a fair price range. Workers' job reports are itemized by the same on-device model. All AI works in airplane mode; bookings sync when the signal comes back.

**Team members:** Team 404 · Marc Ace Flores, Adrian Imbang, Clarence Emlano, Moncito Glenn Hernandez

**Public GitHub repository:** https://github.com/Moncito/TrabaWHO

## The disclosures

**Models used:** Qwen3 1.7B, Q4_K_M GGUF (Apache 2.0; Alibaba Qwen, GGUF by unsloth / Ollama library). On the phone via llama.rn (llama.cpp); on a laptop via Ollama for evaluation. Gemma 3 1B was evaluated and not used.

**Technologies and frameworks:** React Native 0.86, Expo SDK 57, Expo Router, TypeScript, NativeWind + Tailwind, Reanimated, llama.rn / llama.cpp, expo-sqlite, expo-secure-store, NetInfo, Zod, Node.js, Express 5, Prisma 6, PostgreSQL, bcryptjs, jose (JWT), Vitest, Supertest, embedded-postgres, Ollama, Phosphor Icons.

**APIs and cloud services:** No cloud AI API and no cloud service at runtime. Our API and PostgreSQL run locally on the team laptop. One-time downloads only: the model file from Hugging Face, and the app/code from GitHub.

**Existing code and assets:** Expo `create-expo-app` template; Google Fonts (Roboto); Phosphor icons; a capstone topic proposal (planning document only, no code). The carabao logo was made by our team's designer during the hackathon. The catalog, prompts, safety text, eval sets and all app code were written during the hackathon. Catalog prices are illustrative, not sourced market rates.

**AI development tools:** Claude Code (coding, testing on the phone, documentation).

## Why does this product benefit from running AI locally?

Home repairs go wrong exactly when the signal does: a sparking outlet during a brownout, a leak at night with no load, a worker in a basement or ceiling. TrabaWHO's AI runs on the phone, so a client can still describe the problem in Taglish and get the right worker, the urgency and safety steps ("turn off the breaker", "close the valve") with no data, no load cost and no wait for a server. It also keeps private things private: descriptions of the inside of someone's home, and the SMS or chat messages pasted into the scam check, never leave the phone. Only the booking the client approves and the finished job report are synced. On our demo phone (Infinix X6873) an answer takes about 8 seconds in airplane mode, and on unseen test messages the on-device model picked the right kind of worker 11 out of 12 times, against 8 out of 12 for keyword rules.
