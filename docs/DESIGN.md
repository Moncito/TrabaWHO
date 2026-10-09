# TrabaWho — DESIGN.md (UI kit for the hackathon build)

**Companion to** `SPEC.md`, `ARCHITECTURE.md`, `FLOWS.md`. **Mockups:** see the artboard canvas (link in the team chat / PR). Each phone screen there is 360×780 and is named `C01…`, `W01…`, `S01…`; this doc uses the same IDs.

Rule of thumb: **build only what's in this file**. If a screen needs something not listed here, reuse an existing component before inventing one.

---

## 1. Design tokens

Put these in `apps/mobile/src/ui/tokens.ts` and import everywhere. No raw hex values in screens.

### 1.1 Colors

| Token            | Hex       | Use                                                                     |
| ---------------- | --------- | ----------------------------------------------------------------------- |
| `ink`            | `#1F2937` | Charcoal. Primary text, headers, dark buttons, selected chips           |
| `lime`           | `#A3E635` | **Fills only**: primary button, active tab pill, service tile, progress |
| `limeSoft`       | `#ECFCCB` | "Accepted" badge bg, AI chip bg, selected option bg                     |
| `limeInk`        | `#3F6212` | The only "lime" allowed as **text** on white (5:1)                      |
| `bg`             | `#F3F4F6` | Soft Gray. Screen background, inset panels                              |
| `surface`        | `#FFFFFF` | Cards, sheets, inputs, tab bar                                          |
| `border`         | `#E5E7EB` | Card borders, dividers                                                  |
| `borderStrong`   | `#D1D5DB` | Input and ghost-button borders                                          |
| `muted`          | `#4B5563` | Secondary text (7:1 on white)                                           |
| `subtle`         | `#6B7280` | Labels, captions, timestamps (4.8:1 on white; don't go lighter)         |
| `danger`         | `#DC2626` | EMERGENCY badge, hazard border, 911 button (white text on it)           |
| `dangerBg`       | `#FEE2E2` | Hazard alert bg, failed badge bg                                        |
| `dangerInk`      | `#991B1B` | Text on `dangerBg`                                                      |
| `amber`          | `#F59E0B` | Borders/accents for TODAY, offline, low-confidence. **Never text**      |
| `amberBg`        | `#FEF3C7` | TODAY badge bg, offline banner bg, low-confidence banner bg             |
| `amberInk`       | `#92400E` | Text on `amberBg`                                                       |
| `ok`             | `#15803D` | Completed text / icon                                                   |
| `okBg`           | `#DCFCE7` | Completed badge bg                                                      |
| `infoBg`/`infoInk` | `#E0E7FF` / `#3730A3` | REQUESTED ("Hinahanapan") badge                         |
| `scrim`          | `rgba(17,24,39,0.5)` | Behind sheets / modals                                       |

**Contrast rules**

- Lime `#A3E635` on white is ~1.5:1. **Never use lime for text or icons on white/gray.** Lime is a fill with **charcoal** text/icons on it (~10:1).
- On charcoal backgrounds, lime text is fine (wordmark "WHO", "Synced" in toasts).
- Red and amber are not distinguished by hue alone: EMERGENCY is a **solid red fill with white text**, TODAY is a **pale amber fill with dark brown text**. Pending is **dashed outline**, Failed is **solid red border**.

### 1.2 Status → color map (one source of truth)

| State (UI label)                | Badge style                               | Icon (Phosphor)    |
| ------------------------------- | ----------------------------------------- | ------------------ |
| Local `pending` ("Pending")     | white bg, ink text, **dashed** subtle border | `CloudArrowUp`  |
| Local `failed` ("Hindi naipadala") | `dangerBg` / `dangerInk`               | `ArrowsClockwise`  |
| `REQUESTED` ("Hinahanapan")     | `infoBg` / `infoInk`                      | `MagnifyingGlass`  |
| `ACCEPTED` ("Tinanggap")        | `limeSoft` / `limeInk`                    | `Handshake`        |
| `IN_PROGRESS` ("Ginagawa")      | `lime` / `ink`                            | `Wrench`           |
| `COMPLETED` ("Tapos na")        | `okBg` / `ok`                             | `CheckCircle`      |
| `CANCELLED`                     | `bg` / `subtle` (no UI in MVP)            | `XCircle`          |
| Urgency `EMERGENCY`             | `danger` / white                          | `Siren`            |
| Urgency `TODAY` ("Ngayong araw")| `amberBg` / `amberInk`                    | `Clock`            |
| Urgency `SCHEDULED` ("Naka-schedule") | `#E5E7EB` / `ink`                   | `CalendarBlank`    |

### 1.3 Typography

| Token      | Font                       | Size / line | Use                                         |
| ---------- | -------------------------- | ----------- | ------------------------------------------- |
| `display`  | Headline, UPPERCASE        | 34 / 36     | Screen hero ("ANO ANG PROBLEMA?", "NAKA-SAVE!") |
| `title`    | Headline, UPPERCASE        | 24 / 26     | Header bar title                            |
| `h2`       | Headline, UPPERCASE        | 22 / 24     | Section / sheet title                       |
| `price`    | Headline                   | 28 / 28     | "₱400–900", totals (34 on report total)     |
| `heading`  | Archivo Bold 700           | 17 / 22     | Task name, card titles                      |
| `body`     | Archivo Regular 400        | 15 / 21     | Default text, inputs                        |
| `small`    | Archivo Regular / SemiBold | 13 / 18     | Secondary lines, banners                    |
| `caption`  | Archivo Regular            | 12 / 16     | Timestamps, hints                           |
| `label`    | Archivo ExtraBold 800, UPPERCASE, letterSpacing 0.6 | 12 / 16 | Field labels, section labels |
| `button`   | Archivo ExtraBold 800, UPPERCASE, letterSpacing 0.3 | 16 (13 small) | Buttons       |

**Fonts — read this before wiring them up**

- **Impact is not free to bundle.** It is a Monotype font licensed with Windows/Office; shipping the `.ttf` inside an APK needs a license the team almost certainly doesn't have. **Decision default: use Anton (SIL OFL, Google Fonts) as the headline font in the app.** It is the closest free Impact look-alike (condensed, heavy). Keep "Impact" only in slides / web where it is installed locally. If the team has a valid Impact license, drop the `.ttf` into `assets/fonts/` and change one token.
- Load with `@expo-google-fonts/anton` and `@expo-google-fonts/archivo` + `useFonts()` (both use `expo-font`, already in Expo). Keep the splash screen up until fonts load (`expo-splash-screen` `preventAutoHideAsync`).
- **Android does not synthesize weights for custom fonts.** `fontWeight: '700'` does nothing useful. Use one `fontFamily` per weight: `Archivo_400Regular`, `Archivo_600SemiBold`, `Archivo_700Bold`, `Archivo_800ExtraBold`, `Anton_400Regular`. The `<Text variant>` component (below) hides this.
- Anton has a tall cap height; set `lineHeight` ≈ 1.05–1.1× size and `includeFontPadding: false` on Android to avoid clipped/extra top padding.
- Taglish strings are long ("Pending — ipapadala pag may internet"). Never set `numberOfLines={1}` on status text; let it wrap.

### 1.4 Spacing, radii, sizing

- **Spacing scale:** `4, 8, 12, 16, 24, 32`. Screen side padding **16**. Gap between cards **10–12**. Card padding **14**.
- **Radii:** `sm 8` (price inputs) · `md 12` (tiles, chips' container, banners) · `btn 14` (buttons, inputs, list rows) · `card 16` · `sheet 24` (top corners) · `pill 999` (badges, chips).
- **Touch targets:** buttons 52 high (small 40), icon buttons 44×44, list rows ≥ 56. Inputs 48+.
- **Elevation:** almost none. Cards use a 1px `border`, not shadows. Only toasts and sheets get a shadow (`elevation: 6`).
- **Icons:** 20 default, 16 inline with small text, 28–40 in hero circles. Weight `regular`; `bold` at 16 for legibility; `fill` for the airplane indicator.

### 1.5 Voice (UI copy)

Short Taglish, second person, action-first. Buttons are verbs: **I-book**, **Ituloy**, **Baguhin**, **Tanggapin**, **Simulan ang trabaho**, **I-report ang trabaho**, **I-save ang report**, **Tawagan si Rico**, **Tumawag sa 911**, **Subukan ngayon**. Fixed strings from SPEC must match exactly:

- "Ano ang problema?" · "Hindi sigurado — paki-check ang service" (low confidence) · "Pending — ipapadala pag may internet" · "Hindi pa naipapadala — susubukan ulit" · "I-report ang trabaho" · "Cash on completion" (shown as "Cash pagkatapos ng trabaho"; pick one and use it everywhere).

Put all strings in `src/ui/strings.ts` so the pitch-day copy edit is one file.

---

## 2. Icons — `phosphor-react-native`

Install: `npx expo install react-native-svg` then `npm i phosphor-react-native`. Import named icons only (tree-shaken): `import { Drop, Lightning } from 'phosphor-react-native'`. Default props via `<IconContext.Provider value={{ size: 20, color: tokens.ink, weight: 'regular' }}>` at the root.

> Names below are Phosphor v2 names. If one fails to import, search it on phosphoricons.com and swap; the mapping lives in one file (`src/ui/icons.ts`).

### 2.1 Services (`SERVICE_ICON: Record<ServiceCode, Icon>`)

| ServiceCode  | Label (nameTl)      | Icon        |
| ------------ | ------------------- | ----------- |
| `PLUMBING`   | Tubero              | `Drop`      |
| `ELECTRICAL` | Elektrisyan         | `Lightning` |
| `CARPENTRY`  | Karpintero          | `Hammer`    |
| `AIRCON`     | Aircon Technician   | `Snowflake` |
| `WELDING`    | Welder              | `Fire`      |

### 2.2 Urgency (`URGENCY_ICON`)

`EMERGENCY` → `Siren` · `TODAY` → `Clock` · `SCHEDULED` → `CalendarBlank`

### 2.3 Hazards (`HAZARD_ICON: Record<HazardCode, Icon>`)

| HazardCode          | Label (nameTl)       | Icon            |
| ------------------- | -------------------- | --------------- |
| `GAS_SMELL`         | Amoy gas             | `Wind`          |
| `SPARKING`          | May spark            | `Lightning` (weight `fill`) |
| `BURNING_SMELL`     | Amoy sunog o usok    | `FireSimple`    |
| `ACTIVE_FLOODING`   | Bumabaha sa loob     | `Waves`         |
| `NO_POWER`          | Walang kuryente      | `LightningSlash`|
| `STRUCTURAL_DAMAGE` | Sira sa istruktura   | `Barricade`     |
| (alert container)   | —                    | `Warning` (header icon of every HazardAlert) |

### 2.4 Navigation & chrome

| Use                          | Icon                 |
| ---------------------------- | -------------------- |
| Back                         | `CaretLeft`          |
| Row chevron                  | `CaretRight`         |
| Dropdown / picker            | `CaretDown`          |
| Close sheet                  | `X`                  |
| Client tab: new problem      | `Plus`               |
| Client tab: bookings         | `ListBullets`        |
| Worker tab: jobs             | `Briefcase`          |
| Account / switch account     | `UserCircle` / `UserSwitch` |

### 2.5 Actions & system

| Use                                      | Icon                     |
| ---------------------------------------- | ------------------------ |
| Call / 911                               | `Phone` (911: `PhoneCall`) |
| Edit card                                | `PencilSimple`           |
| AI / "Suriin" / "Gawing report"          | `Sparkle`                |
| On-device AI badge, model status         | `Cpu`                    |
| Airplane mode / offline indicator        | `AirplaneTilt` (weight `fill`) |
| No connection (if not airplane)          | `WifiSlash`              |
| Back online                              | `WifiHigh`               |
| Pending / queued                         | `CloudArrowUp`           |
| Synced                                   | `CloudCheck` or `CheckCircle` |
| Retry / syncing                          | `ArrowsClockwise`        |
| Failed                                   | `WarningCircle`          |
| Address                                  | `MapPin`                 |
| Duration                                 | `Clock`                  |
| Verified worker                          | `SealCheck`              |
| Start job                                | `Play`                   |
| Cash on completion                       | `Money`                  |
| Add material row                         | `Plus`                   |
| Delete material row                      | `Trash`                  |
| Locked urgency (safety floor)            | `LockSimple`             |
| Low confidence                           | `Question`               |
| Completed hero                           | `CheckCircle` (weight `fill`) |

---

## 3. Components to build

All live in `apps/mobile/src/ui/`. Plain `StyleSheet` + tokens; no UI kit. Props are sketches, keep them that small.

### 3.1 Primitives

```ts
// Text.tsx — the only place fontFamily is set
type TextVariant = 'display'|'title'|'h2'|'price'|'heading'|'body'|'small'|'caption'|'label'|'button';
<Text variant="heading" color="muted" numberOfLines?>...</Text>

// Button.tsx
type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' /*lime*/ | 'dark' | 'ghost' | 'danger';
  size?: 'md' /*52*/ | 'sm' /*40*/;
  icon?: Icon;           // phosphor component
  loading?: boolean;     // shows ActivityIndicator, disables
  disabled?: boolean;
  disabledReason?: string; // e.g. "Kailangan ng internet para tumanggap" (S01 #8)
};

// IconButton.tsx  { icon: Icon; onPress; accessibilityLabel: string; tone?: 'onDark'|'onLight' }
// Card.tsx        { children; tone?: 'default'|'dashed'|'danger'|'dark'; style? }
// Badge.tsx       { label: string; tone: 'emergency'|'today'|'scheduled'|'pending'|'failed'|'requested'|'accepted'|'inProgress'|'completed'|'verified'; icon?: Icon }
// Chip.tsx        { label; icon?; selected?; onPress }   // service chips, quick picks
// TextField.tsx   { label; value; onChangeText; multiline?; placeholder?; editable? }  // focus = ink border + lime 3px ring
// Header.tsx      { title; subtitle?; onBack?; right?: ReactNode; tone?: 'default'|'danger' }  // charcoal bar
// Screen.tsx      { children; footer?: ReactNode; scroll?: boolean }  // SafeArea + OfflineBanner slot + sticky footer
```

### 3.2 Domain components

```ts
// ServiceTile.tsx — lime rounded square with service icon (44×44)
{ service: ServiceCode; size?: 44|56; dark?: boolean }

// UrgencyBadge.tsx — wraps Badge using §1.2
{ urgency: Urgency }

// StatusBadge.tsx — one badge for both local outbox and server statuses
{ status: BookingStatus | 'PENDING' | 'FAILED' }

// HazardAlert.tsx — red box: Warning icon, hazard nameTl, safety text (from catalog), optional 911 button
{ notes: SafetyNote[]; showHotline: boolean; hotline: string /* "911" */; compact?: boolean }
// - GAS_SMELL / showEmergencyHotline → big variant, red header, "Tumawag sa 911" = Linking.openURL('tel:911')
// - compact = one line, used in lists and job cards

// BookingCard.tsx — renders BookingCardData (C04/C05/C06/S02)
{ data: BookingCardData; onEdit: () => void; highlightService?: boolean }
// order: [LowConfidenceBanner | FallbackBanner] → HazardAlert(s) → service row + UrgencyBadge
//        → task name → AI summary panel ("Buod ng AI") → price/duration → questions
// highlightService = data.lowConfidence || data.source === 'fallback'

// LowConfidenceBanner.tsx  { kind: 'low'|'fallback' }   // amber banner; copy differs per kind

// EditBookingSheet.tsx — C07 (Modal, slide up)
{ visible; value: { service; task; urgency }; minUrgency: Urgency /* from hazards */; onSave(v); onClose }
// - changing service resets task to <SERVICE>_INSPECT
// - urgency options below minUrgency are disabled + LockSimple note "Naka-Emergency dahil may spark"
// - task rows show price/min from catalog (estimateForTask)

// AddressForm.tsx  { address; barangay; city /* prefilled from user */; onChange }

// BookingRow.tsx — list item for C11 / W01 "Akin"
{ title; service; status; subtitle?; urgency?; onPress?; onRetry?: () => void /* only when FAILED */ }

// JobCard.tsx — worker open-job card (W01)
{ booking; onAccept?: () => void; accepting?: boolean; offline?: boolean }

// PersonCard.tsx — worker or client with Call button (C12, W02)
{ name; role: 'worker'|'client'; phone; verified?: boolean; serviceLabel?: string }
// Call → Linking.openURL(`tel:${phone}`)

// StatusTimeline.tsx — C12
{ status: BookingStatus; times?: Partial<Record<BookingStatus, string>> }
// steps: Naipadala → Hinahanapan → Tinanggap → Ginagawa → Tapos na; done = ink dot, current = lime dot w/ ring

// MaterialsTable.tsx — W04
{ rows: Array<Material & { unitPrice?: number }>; onChange(rows); editableNames?: boolean }
// columns: Item | Dami | Presyo (numeric input, ₱) | Halaga (qty×price). Empty price = amber input.
// "+ Magdagdag ng materyales" adds { name:'', qty:1, unit:'pc' }. Cut-list #2: names read-only.

// TotalsCard.tsx — W04/W05/W06  { laborCost; materialsCost; total; note?: string }
// values ONLY from computeReportTotals() in packages/shared

// OfflineBanner.tsx — amber strip under the header (S01 #1)
{ pendingCount: number }  // reads useNetwork(); hidden when online
// copy: "Offline. Gumagana pa rin ang AI." / "Offline · N item naghihintay ipadala"

// AirplaneIndicator — part of OfflineBanner (AirplaneTilt fill icon). The OS status bar already shows
// airplane mode; this in-app indicator is for the demo video / projector.

// Toast.tsx + ToastProvider — S01 #2/#3/#7
// useToast().show({ kind: 'syncing'|'synced'|'error', text, durationMs? = 3000 })
// one toast at a time, top of screen under header

// AIThinking.tsx — C03 (pulse circle + 3 step lines + skeleton card)
// ModelStatus.tsx — S03 notice + "Subukang i-load ulit" (calls aiService.init())
// EmptyState.tsx  { icon; title; hint? }
// ResultHero.tsx  — C09/C10/W05: big circle icon + display text + subline { kind: 'sent'|'pending' }
```

### 3.3 Hooks (UI-facing, owned by SWE)

```ts
useNetwork(): { online: boolean }                      // NetInfo isConnected && isInternetReachable !== false
useOutbox(): { pending: OutboxRow[]; failed: OutboxRow[]; retry(id?): Promise<void> }
usePolling(fn, { intervalMs: 5000, enabled })          // only while screen focused (useFocusEffect) and online
useSession(): { user: User | null; setUser; clear }    // seeded account; x-user-id header
useIntakeDraft(): { card: BookingCardData|null; edits; setCard; setEdits; reset } // passes card between screens
```

---

## 4. Libraries (minimal set)

| Package | Why | Status |
| --- | --- | --- |
| `expo-router` | Navigation, tabs, typed routes | In the Expo template |
| `react-native-safe-area-context`, `react-native-screens` | Required by expo-router | In the template |
| `expo-font` + `@expo-google-fonts/anton` + `@expo-google-fonts/archivo` | Brand fonts offline (bundled in APK) | `expo-font` in Expo; add the two font packages |
| `expo-splash-screen` | Hold splash until fonts + session load | In the template |
| `react-native-svg` + `phosphor-react-native` | Icons | Add (`npx expo install react-native-svg`) |
| `react-native-reanimated` | All animations below (entering/exiting presets, `withRepeat`) | In the default template (SDK 50+); verify `babel` plugin / SDK version |
| `@react-native-community/netinfo` | Online/offline | Already planned (ARCH 2) |
| `expo-sqlite` | Outbox + cache | Already planned |
| `expo-crypto` | `randomUUID()` for `clientRef` (Hermes has no `crypto.randomUUID`) | Expo package, add |
| `expo-haptics` | Light tap on Book / Accept / Save (nice-to-have) | Expo package, optional |
| `Linking` (react-native core) | `tel:` for Call and 911 | Core |

**Not recommended (skip for time):**

- `@gorhom/bottom-sheet`: needs gesture-handler + reanimated config and fights `Modal` on Android. Use core `Modal` with `animationType="slide"`, `transparent`, a `Pressable` scrim and a bottom-aligned `View`. Good enough for one sheet (C07).
- Toast libraries: a 40-line `ToastProvider` with Reanimated is simpler than configuring one.
- UI kits (Tamagui, NativeBase, Paper, gluestack): setup cost and theming fights > benefit for ~15 screens.
- State libraries (Zustand/Redux): React context + `useSyncExternalStore` over SQLite is enough. Zustand is acceptable if someone already knows it (1 file, no config).

---

## 5. Animations

Use Reanimated layout animations (`entering`/`exiting` props) wherever possible: no shared values, no worklets to debug. Respect `useReducedMotion()` (skip pulses; keep fades).

| # | Animation | Purpose | Implementation | Priority |
| - | --- | --- | --- | --- |
| A1 | **AI thinking pulse** (C03) | Show the phone is working, not frozen, during 5–15 s | Lime circle: `withRepeat(withSequence(withTiming(1.08,{duration:600}), withTiming(1,{duration:600})), -1)` on `scale` + halo opacity. Step lines switch on timers (0 s, 1.5 s, 4 s): cosmetic, label them honestly ("Binabasa…", "Pinipili…", "Tinitingnan ang safety…") | **Must** |
| A2 | **Booking Card reveal** (C04–C06) | Make the AI result feel like an answer; draw the eye to hazards first | Wrap sections in `Animated.View entering={FadeInDown.duration(250).delay(i*60)}`; HazardAlert index 0 so it lands first | **Must** |
| A3 | **Pending → sent** (C11 rows, C10 → C09 state) | The demo's "aha": items flip when airplane mode goes off | Key the `StatusBadge` by status so Reanimated swaps it with `entering={FadeIn}` / `exiting={FadeOut}`; on the row, flash bg `lime → surface` over 600 ms (`useSharedValue` + `withTiming`) when status leaves `PENDING` | **Must** |
| A4 | **Sync toast** (S01 #2/#3) | Confirm background sync without blocking | `entering={SlideInUp.springify().damping(18)}`, `exiting={SlideOutUp}`; auto-hide 3 s; "syncing" variant spins `ArrowsClockwise` with `withRepeat(withTiming(360))` | **Must** |
| A5 | **Offline banner in/out** | Make the airplane-mode switch visible on the projector | `entering={FadeInUp}` / `exiting={FadeOutUp}` + `LinearTransition` on the content below so it slides instead of jumps; show lime "Online ulit" for 2 s on reconnect | **Must** |
| A6 | Sheet slide-up (C07) | Context for editing | Core `Modal animationType="slide"`: free | Must (free) |
| A7 | Status timeline step (C12) | Show progress when polling detects a change | New "current" dot: `entering={ZoomIn.springify()}`; connector line fills via `FadeIn` | Nice |
| A8 | 911 button attention (C06) | Draw eye to safety action | Border/halo pulse 3 cycles then stop (`withRepeat(...,3)`); off when reduced motion | Nice |
| A9 | Skeleton shimmer (C03 placeholder card) | Hint at the card shape coming | Animated opacity 0.5↔1 on gray blocks (no gradient lib needed) | Nice |
| A10 | Total count-up (W04) | Satisfying total | Skip unless done: text that updates instantly is fine | Skip |
| A11 | Haptics | Tactile confirm on Book / Accept / Save | `Haptics.impactAsync(Light)` | Nice |

Cut order if behind: A9 → A8 → A7 → A11. Never cut A1, A3, A5: they carry the demo.

---

## 6. Screen inventory (mockup ID → route → key components)

| ID | Screen | Route (see FLOWS.md) | Components |
| --- | --- | --- | --- |
| C01 | Account switcher | `/login` | Header (wordmark), BookingRow-style user rows, Badge(verified), Button |
| C02 | Ano ang problema? | `/(client)/new-problem` | OfflineBanner, TextField(multiline), Chip×5, Button(Sparkle), tabs |
| C03 | AI thinking | same screen, `loading` state | AIThinking |
| C04–C06 | Booking Card (normal / low conf / emergency gas) | `/(client)/booking-card` | BookingCard, HazardAlert, LowConfidenceBanner, Button |
| C07 | Edit sheet | modal on booking-card | EditBookingSheet |
| C08 | Address + Book | `/(client)/booking-card` step 2 (or `/(client)/address`) | AddressForm, compact HazardAlert, Button |
| C09/C10 | Booked / Pending | `/(client)/booked?ref=` | ResultHero, Card, StatusBadge |
| C11 | My bookings | `/(client)/bookings` | OfflineBanner, BookingRow (pending/failed/...), tabs |
| C12 | Booking detail | `/(client)/booking/[ref]` | PersonCard, StatusTimeline, Card |
| W01 | Open jobs | `/(worker)/jobs` | Segmented (Bukas / Akin), JobCard, tabs |
| W02 | Job detail | `/(worker)/job/[id]` | PersonCard, Card, HazardAlert(compact), Button(Start / I-report) |
| W03 | Report input | `/(worker)/report?bookingId=` | OfflineBanner, TextField(multiline), Button(Sparkle) |
| W04 | Report review | same screen, `draft` state | MaterialsTable, TotalsCard, Button |
| W05 | Report saved (pending) | same screen, `saved` state | ResultHero(pending), TotalsCard |
| W06 | Completed | `/(worker)/job/[id]` when COMPLETED | Toast(synced), receipt Card |
| S01 | System states | (components) | OfflineBanner, Toast, BookingRow(failed), Button(disabledReason), EmptyState |
| S02 | AI fallback card | booking-card with `source:'fallback'` | LowConfidenceBanner(kind=fallback) |
| S03 | Model not loaded | new-problem when `init()` failed | ModelStatus, service grid → EditBookingSheet with blank card |
