# Handoff: where we left off (Oct 10, ~05:05)

The AI/docs work session hit its usage limit at 05:05 while testing a fix on the phone. This file picks up from there. Deadline: **submit by 10:00**, with the repo public and the code frozen.

## 1. Repo state

| Branch | What it is |
|---|---|
| `main` (`6502bd8`) | Everything merged so far: v3 design, auth/profiles, local DB, demo fixes, welcome/booking/cancel redesign, model download, guest mode, cancel-sheet fix |
| `ai/input-guard` (`fa324fd`) | `main` + one commit: the nonsense-input check. **Not merged into `main` yet**; waiting for the phone test |
| `debug/all` | The phone test build: the same commit as `ai/input-guard`, plus this file. Use it on a new device |
| `ai/two-step` | Skipped on purpose; don't merge |
| Other `ai/*`, `swe/*`, `design/*` | Already merged into `main`; can be deleted on GitHub |

**On the old laptop:** the local `debug/all` has the same files but different merge commits. Don't push it. To switch it to this one, run `git status` first; if nothing in it needs keeping, run `git fetch origin && git checkout debug/all && git reset --hard origin/debug/all`.

## 2. Team rules (must follow)

- Commits are authored and committed as **Moncito <moncitoglenn03@gmail.com>**. No `Co-Authored-By` or other trailers, and no AI names in commits, branches or PR text.
- Short feature branches, such as `ai/...`, `swe/...` or `design/...`. **Moncito merges**; don't open or merge PRs unless asked.
- Don't switch branches or run `npm install` in a checkout while Metro or the API is running from it. This once removed the auth packages and crashed the API.

## 3. Running it on a new device

```bash
git clone https://github.com/Moncito/TrabaWHO.git && cd TrabaWHO
git checkout debug/all
npm install
```

- **API.** Copy `apps/api/.env` from the old laptop; it isn't in git and needs `DATABASE_URL`, `DIRECT_URL` and `JWT_SECRET`. Then:
  - `npm run db:local -w apps/api` starts the embedded Postgres on `:5432`. Keep that terminal open.
  - `npm run db:deploy -w apps/api && npm run db:seed:demo -w apps/api` sets up the database. The demo password is `trabawho-demo`; the accounts are `demo.client@`, `demo.plumber@`, `demo.electrician@` and `demo.carpenter@trabawho.test`.
  - `npm start -w apps/api` starts the API on `:3000`.
- **Phone, USB debugging on:**
  - `adb reverse tcp:3000 tcp:3000 && adb reverse tcp:8081 tcp:8081`
  - `cd apps/mobile && npx expo run:android` builds and installs the app. The first build takes 5–10 minutes. After that, `npx expo start --dev-client -c` is enough.
  - Android only: the web build doesn't work (expo-sqlite).
- **Model.** On first run, the in-app "Offline AI setup" screen downloads it (Hugging Face fallback, about 1 GB). Or use `adb push` as in `docs/SETUP.md`.
- **Checks before any push:** `npm run typecheck`, `npm test`, and `cd apps/mobile && npx expo export --platform android`.

## 4. Where it stopped: the nonsense-input check (`ai/input-guard`)

**Why:** typing `asdsadasdasd` produced **"Amoy gas sa kusina"** with a Call 911 card. The model copied a prompt example word for word, so nonsense could create a fake emergency.

**What the commit does:**
- **Before the AI**, in `packages/shared/src/rules/inputCheck.ts` (`checkProblemText`, `checkReportText`, `hasRepairSignal`, `MAX_INPUT_CHARS`):
  - Blocks keyboard mashing, text under about 3 words, and text over 500 characters.
  - Shows a Tagalog/English hint under the box instead of calling the AI.
  - Hazard or repair keywords always pass, so `gas!!` is never blocked.
  - The scam check only gets a 1,000-character cap.
- **After the AI**, in `packages/shared/src/ai/pipeline.ts`: if the text has no repair or hazard words and the model is unsure or echoes a prompt example, no booking card is made. The user goes to "Pick a service" instead. A hazard only counts if the user's own words mention it.
- **App wiring:** `(client)/new-problem.tsx`, `(worker)/report.tsx`, `scam-check.tsx`, `ai/stats.ts`, and `ai-stats.tsx`, which shows "Not understood (no card)".
- **Tests:** 75 shared + 11 API pass, typecheck passes, and all 42 eval problems plus every eval report still pass the check.

**Next steps:**
1. **Phone test.** On the last reload, the app closed to the launcher with no crash in logcat. It was probably the reload, not the code. Open the app and try:
   - `asdsadasdasd`: a hint appears and the AI isn't called.
   - `hello how are you`: goes to "Pick a service".
   - A real problem, such as `May tulo sa ilalim ng lababo namin`: works as before.
2. Add a `docs/PROGRESS.md` entry (section 2.24) for the input check.
3. Merge `ai/input-guard` into `main` (Moncito merges).

## 5. Open bugs from the full phone run (20:46)

The end-to-end flow worked: client books, then the worker matches, accepts, starts and sends an AI report (₱2,100 total, with the server agreeing), then the client sees Done. Bugs found:

| # | Bug | Where to fix |
|---|---|---|
| 1 | Back from booking detail goes to the **Book** tab instead of Bookings | `apps/mobile/src/app/(client)/_layout.tsx`: the tabs use the default back behaviour (first tab). Try `backBehavior="history"` on `<Tabs>` |
| 2 | Clock and status icons **invisible** on the light home screen (white on white) | Root `_layout.tsx` sets `<StatusBar style="light" />` everywhere. Use `style="dark"` on the light home (`(client)/new-problem.tsx`) and the auth screens |
| 3 | Done row says "Done · paid in cash", but the app can't know payment happened | `apps/mobile/src/app/(client)/bookings.tsx`, `LINE.COMPLETED` → "Done · pay in cash" |
| 4 | AI report draft lists cleaned parts (filter, coil) as **materials** and misses refrigerant (freon) | Report prompt in `packages/shared/src/ai/prompts.ts` (materials rule about line 80, examples below). Add "cleaned/checked ≠ material" and a freon example. Re-run the report eval after |

## 6. Still to do before 10:00

- [ ] **Offline report test:** create and accept a fresh booking, turn on airplane mode, save the report (it should say "Report saved!"), go back online, and check it sends itself.
- [ ] **Reset the demo data:** the demo booking ("Aircon not cooling") is now Completed. Book a fresh one before the pitch.
- [ ] **Release APK** from the final `main`: `cd apps/mobile/android && ./gradlew assembleRelease`, which outputs `app-release.apk` (see `docs/SETUP.md`). Attach it to a GitHub Release.
- [ ] **Model download source:** the GitHub Release `model-v1` isn't uploaded yet, so the app falls back to Hugging Face. Optionally upload the `.gguf` to that release.
- [ ] **Prices:** catalog prices in `packages/shared/catalog.json` are illustrative, not sourced. In Q&A, say "illustrative; one JSON file, so real rates drop in without code changes".
- [ ] **Moncito's side:**
  - Make the repo public.
  - Record the demo video (about 1 minute).
  - Post on X/LinkedIn, tagging Devin/Cognition with #AppBuildersPH.
  - Submit once, by 10:00.

## 7. Design source

- **Artboards:** the "TrabaWHO Screens v4" canvas.
  - Welcome: logo slide plus three feature slides.
  - Log in and Sign up.
  - Client screens: Home (Ask AI), Booking with cancel, the "Why cancel?" sheet, and Cancelled.
  - Older v3 boards are in the original TrabaWHO Screens canvas.
- **Logo:** `apps/mobile/assets/images/logo.png`, the designer's carabao mark.
- **Not built from v4:** phone-number login, one-time code, and "Forgot password?". They need server support.
