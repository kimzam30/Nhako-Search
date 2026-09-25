# NhakoSearch — Engineering Handoff

**Written:** 2026-08-06
**Repo:** `/home/kimzam/Documents/Work/Nhako-Search` · branch `main` · HEAD `a16d602`
**Live:** [search.nhako.com](https://search.nhako.com)

This document exists so a fresh conversation can pick the project up cold. It
covers **what** the system is, **where** everything lives, and **why** the
non-obvious decisions were made — because several of them look wrong until you
know the bug they fixed.

---

## 0. HOW TO WORK ON THIS PROJECT — READ BEFORE DOING ANYTHING

> ### 🛑 DO NOT PROCEED TO THE NEXT PHASE UNTIL THE USER SAYS **"ready boss"**
>
> Work is done in **phases**. After finishing a phase:
>
> 1. Report what changed, what was verified, and what was not.
> 2. **STOP.**
> 3. Wait for the literal words **"ready boss"** before starting the next phase.
>
> Do not chain phases together. Do not assume approval. If the user says
> anything other than "ready boss" — a question, a bug report, a screenshot —
> handle that, then stop and wait again.

Two more standing rules from the user:

- **Never `git add`, `git commit`, or `git push`.** The user reviews and commits
  everything themselves. Leave changes unstaged in the working tree.
- **Budget is RM0 and must stay RM0.** Vercel Hobby, Supabase Free, GitHub
  Actions free tier. Do not propose anything with a bill.

---

## 1. What this project is

A cozy, hand-drawn word-search game built for two people — the user and their
partner. It is a personal hobby project, not a commercial product.

**Five ways to play:**

| Mode | Route | Notes |
|---|---|---|
| Free play | `/play/standard/[theme]/[difficulty]` | Pick a theme + difficulty, unlimited puzzles |
| Daily challenge | `/daily` | One shared seeded puzzle per day, tracks a streak |
| Level path | `/level-path` → `/level-path/[levelId]` | 360 levels across 12 chapters, 3-star scoring |
| Race | `/play/race/[roomCode]` | Two players, separate boards, first to finish |
| Co-op ("Together") | same route, leader picks the mode | Two players, **one shared board**, finds pooled |

**Difficulty:** easy 8×8 / 6 words · medium 10×10 / 8 · hard 13×13 / 10.

**Design language** — "The Meadow Journal", documented in `docs/design.md`:
asymmetric border radii, solid offset "sticker" shadows (never blurred), paper
grain texture, hand-drawn SVG icons, no emoji in UI chrome.

The user is happy with the **game logic, the grid, and swipe-to-select. Do not
change those without being asked.**

---

## 2. Current status — verified 2026-08-06

Everything below was actually executed in this session, on this machine. This is
the first session where a Node toolchain was available, so it is the first real
verification the project has had.

| Check | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | **0 errors** |
| Production build | `npm run build` | **Passes** — 12 routes, 10 prerendered static |
| Build with no `.env.local` | `npm run build` | **Passes** (see §6.1) |
| Lint | `npm run lint` | **21 problems** (12 errors, 9 warnings) — see §7.1 |
| Tests, environment-independent | `npx playwright test` on `grid-layout`, `performance`, `a11y-responsive`, `audio` | **44 / 44 pass** |
| Tests, everything else | `ui`, `security`, `gameplay`, `race` | **17 pass, 11 fail** — all explained below |

### Why those 11 fail (none is a newly-found product bug)

- **5 in `race.spec.ts` / `gameplay.spec.ts`** — they open two clients and need a
  real Supabase Realtime backend. I ran with a placeholder URL, so no channel
  ever connects. **Run these against real credentials.**
- **2 in `security.spec.ts`** — they assert CSP and HSTS headers, which are now
  deliberately **production-only** (§5.6). They pass only under
  `npm run build && npm start`, never `npm run dev`.
- **4 in `ui.spec.ts`** — stale selectors written before later phases changed the
  markup (same class of problem as the three I fixed this session).

### Real bugs the tests caught, now fixed

1. **Mixer settings were wiped on every reload.** The provider's persist effect
   ran on mount while state was still `defaultVolumes` and overwrote the saved
   mix before hydration landed. Fixed by skipping the first persist run.
2. **Ref written during render** in `useGameLogic` — a genuine React violation I
   introduced in Phase 7. Moved into an effect.
3. **`Date.now()` evaluated on every render** in `GameClient` (`useState(Date.now())`
   instead of a lazy initialiser), plus the same class of issue in the profile modal.
4. **The build could not run without `.env.local`** (§6.1).
5. The nav's mixer button had **no accessible name** — added `aria-label`.

---

## 3. Stack and layout

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 ·
Framer Motion · Supabase (Postgres + Google OAuth + Realtime) · Playwright ·
Vercel.

```
app/                      Routes. 8 of 12 pages are 'use client'.
  layout.tsx              Fonts, metadata/icons, theme script, providers
  globals.css             Design tokens + the layout rules that matter (§5)
  loading.tsx             Route skeletons (also in daily/, level-path/, profile/, settings/)
  daily/ level-path/ play/ profile/ settings/ sign-in/

components/
  game/                   GridBoard, LetterCell, GameClient, WordList,
                          ButterflyGarland, PartnerGridDisplay
  multiplayer/ChatWidget  Preset banter tray
  nav/FloatingNav         Bottom pill (phone) / left rail (desktop)
  sound/AmbientAudioProvider   Global audio context + mixer state
  ui/                     Button, Card, Icons, Skeleton

lib/
  puzzle/generator.ts     Deterministic grid generation
  puzzle/useGameLogic.ts  Selection, found-words, keyboard, hints
  multiplayer/useRaceRoom.ts   Realtime room state machine  ← most complex file
  multiplayer/identity.ts Room codes + stable guest ids
  multiplayer/history.ts  Match history + "together" butterfly
  audio/engine.ts         Procedural ambience  |  audio/sfx.ts  Game sounds
  levels/data.ts          360 levels, lazily generated
  daily/logic.ts          Game-day timezone + streaks
  auth/                   profile, merge (guest→account), deleteData
  words/*.json            Six themed pools (~27 KB total)
  types.ts                Shared row shapes

docs/design.md            Visual system spec
docs/ROUTING_MAP.md       Every tappable target and where it goes
supabase_schema.sql       Base schema for a fresh project
supabase/migrations/002_security.sql   Required for existing projects
newissue2.md              Current issue backlog
tests/                    8 Playwright suites
```

**Database tables** (all with RLS, all keyed to `auth.uid()`):
`profiles`, `level_progress`, `daily_challenge_log`, `butterfly_collection`,
`race_history`.

**Client storage keys** — all prefixed `nhako_` except two:
`nhako_levels`, `nhako_collection`, `nhako_daily`, `nhako_merged`,
`nhako_guest_mode`, `nhako_guest_name`, `nhako_guest_id`, `nhako_theme`,
`nhako_audio_volumes`, `nhako_last_room_created`, `nhako_recent_*`, plus
`is_leader_<ROOMCODE>` and `splash_seen` (both sessionStorage).

---

## 4. Guest vs signed-in — this trips people up

Every feature works without an account. The data path forks everywhere:

- **Signed in** (Google OAuth): reads/writes Supabase tables.
- **Guest**: reads/writes `localStorage` under the keys above.

`lib/auth/merge.ts` migrates guest progress into the account on first sign-in,
guarded by the `nhako_merged` flag. It is invoked **only** by
`<MergeClient />` in the layout — do not call it from a page as well; doing so
raced the flag and double-upserted.

Guests **cannot** record race history (no `auth.uid()` to attribute it to), so
their Wins stat is always 0. That is by design, not a bug.

---

## 5. Critical invariants — break these and the app breaks

Each one is here because it was an actual, diagnosed bug. The comments in the
code say the same thing; this is the index.

### 5.1 `GridBoard` must declare BOTH grid axes

```ts
gridTemplateColumns: `repeat(${grid.width}, minmax(0, 1fr))`,
gridTemplateRows:    `repeat(${grid.height}, minmax(0, 1fr))`,   // ← required
```

Without the rows line, rows size to the text line-height. Measured consequences
on a phone in hard mode: the grid overflowed its own card by **100.5px**, cells
became 13.3×21 instead of square, and the highlight overlay drifted up to
**96.7px** away from the letters it was supposed to circle. The pointer
hit-test uses the same geometry, so dragging also selected the wrong row.

### 5.2 The board sizes from WIDTH, never from leftover flex height

`.grid-board` in `globals.css`:
`width: max(200px, min(100%, 450px, 100dvh - 330px))`

An earlier wrapper used `aspect-square h-full`, deriving width from whatever
vertical space was left. The board collapsed to **106px on a phone** and 182px
on tablet. **Never reintroduce `h-full` + `aspect-square` on a board wrapper.**

### 5.3 Supabase broadcast payloads are nested one level deeper than you expect

```ts
channel.on('broadcast', { event: 'state_update' }, msg => {
  const { id, state } = msg.payload;   // ✅
  // const { id } = msg;               // ❌ always undefined
});
```

Supabase delivers `{ type, event, payload }`. Reading the top level made every
field `undefined`, which silently broke the entire race lobby. I verified this
against the live Realtime server with a raw WebSocket.

### 5.4 Race state is keyed `me` / `opponent` by user id — never positionally

An earlier design used `playerA`/`playerB`, but **both clients initialised
`playerA` to themselves**, so "playerA" meant "me" on both machines. Every
incoming update became guesswork, and a single match wrote two history rows.

### 5.5 Word selection must use Fisher-Yates, not `sort(() => random() - 0.5)`

That comparator is inconsistent, so the result depends on the JS engine's sort
algorithm. The same seed produced **different boards in Chrome vs Safari**,
which desynced races. Applies to `lib/puzzle/generator.ts` and
`lib/levels/data.ts`.

### 5.6 CSP and HSTS are production-only

`upgrade-insecure-requests` over plain HTTP rewrites every subresource to
`https://`, which a dev server does not speak. Scripts and fonts fail, the app
never hydrates, and you get a blank page with only un-animated markup. CSP
problems therefore **only appear in a production build** — verify with
`npm run build && npm start`, never `npm run dev`.

### 5.7 `allowedDevOrigins` must list any host used to reach the dev server

Next 16 blocks cross-origin dev resources. Reaching the dev server by LAN IP
counts as cross-origin, silently blocking `/_next/*` and HMR. Set via
`next.config.ts` or the `DEV_ORIGINS` env var.

### 5.8 The `AudioContext` is suspended, never closed

A closed context cannot be reopened. Closing it in a cleanup killed audio for
the rest of the session.

### 5.9 `useRaceRoom`'s dependency arrays are deliberate

Refs are used specifically so the realtime channel is **not** torn down and
rebuilt mid-race. There is an `eslint-disable-next-line react-hooks/exhaustive-deps`
on the channel effect. **Do not "fix" it by adding the refs.**

---

## 6. Things that are surprising but correct

### 6.1 The app builds without Supabase credentials

`lib/multiplayer/supabase.ts` falls back to a placeholder URL. `createClient('')`
throws *at module load*, which took down the whole production build during
prerendering and surfaced as an opaque stack trace. It now logs a clear error
instead; real requests still fail loudly at runtime.

### 6.2 All audio is synthesised — there are no audio files

`lib/audio/engine.ts` generates rain (pink noise), wind (LFO-swept bandpass),
birds (FM chirps), thunder (noise through a downward-sweeping lowpass, gated on
the rain level), and a generative lofi chord progression. `lib/audio/sfx.ts`
does the game sounds.

This replaced 1.2 MB of files that were WAV data mislabelled as `.mp3` — and
`thunder.mp3` was byte-identical to `rain.mp3`. Zero bandwidth now, no licensing
to track, no loop seam.

To use a real lofi recording: drop it at `public/audio/lofi.mp3` and set
`LOFI_SAMPLE_URL` in `engine.ts`. Details in `public/audio/README.md`.

### 6.3 The hand-drawn wobble is path geometry, not an SVG filter

It used `feTurbulence` + `feDisplacementMap` on two elements per found word,
re-rasterised every animation frame. Replaced with a seeded jittered polyline:
**3.4× faster** to rasterise, same look.

### 6.4 The daily challenge rolls over at UTC+8

One constant: `GAME_DAY_UTC_OFFSET_MINUTES` in `lib/daily/logic.ts`. Previously
the seed used local date parts while the streak compared against UTC midnight,
so between local midnight and 08:00 the app thought you had already played —
the daily was **unavailable for eight hours every day**.

### 6.5 Levels are generated lazily

`lib/levels/data.ts` builds ids and metadata eagerly (cheap) and word lists on
demand. Building all 360 up front cost 10.8 ms at module load on every page that
imported it, including the home screen. Now 0.1 ms.

---

## 7. Open issues

`newissue2.md` is the full backlog. The highlights:

### 7.1 Lint: 21 problems (12 errors, 9 warnings)

Nothing blocks the build. Breakdown:

| Count | Rule | Assessment |
|---|---|---|
| 7 | `Calling setState synchronously within an effect` | React 19's new rule. Pre-existing data-loading patterns. Working, but worth a pass. |
| 5 | `no-unused-vars` | Trivial. |
| 3 | `react/no-unescaped-entities` | Apostrophes in JSX text. Trivial. |
| 3 | `@next/next/no-img-element` | Google avatars via `<img>`. Deliberate — `next/image` for a 48px avatar is not worth the config. |
| 1 | `exhaustive-deps` | In `/play/standard/[...slug]`. Check before changing. |
| 1 | `no-html-link-for-pages` | `<a href="/">` in FloatingNav. |

### 7.2 The race lobby sync fix is UNVERIFIED

This is the most important open item. The user reported the room creator had to
refresh before "Start" would enable. I **reproduced it on the live site** with
two clients and a raw WebSocket observer:

- The guest genuinely sends both a `state_update` broadcast **and** a presence
  diff carrying `isReady: true`.
- The leader never applies either. Its own local UI updates fine, but it sends
  no frames of its own.
- A leader alone in a fresh room sends normally. So it is timing-dependent.

I could **not** pin the exact trigger from outside a production build. Rather
than guess, I made the lobby converge instead of depending on event delivery:
presence is re-read on a 1-second interval while the lobby/countdown is open,
and `applyOpponent` ignores identical payloads so it costs nothing.

**This is a convergence fix, not a proven root-cause fix. It needs two-device
testing.** If it still misbehaves, the next step is to instrument
`useRaceRoom`'s subscribe callback and cleanup in a local production build
(`npm run build && npm start`) and find out why the channel stops applying
updates.

### 7.3 Four stale tests in `ui.spec.ts`

Written in early phases, never run until now, and left behind by later changes —
e.g. they look for `svg line` in the highlight overlay, but Phase 5 replaced
those with `<path>` geometry. Fixing them is mechanical; I fixed the equivalent
staleness in `grid-layout`, `performance` and `audio` this session.

### 7.4 Other known items

- **Race results are client-reported.** RLS restricts inserts to the leader and
  constrains `winner` to a participant, but the leader's client still decides.
  Unforgeable results need an Edge Function — out of scope at RM0.
- **No `error.tsx` / `not-found.tsx`** — errors fall back to Next's default UI.
- **Chat is preset-only**; free text was scoped and never built.
- **`raceState.round` increments but nothing displays it** — best-of-3 unbuilt.
- **No ghost cursor** for seeing where your partner is dragging.
- **Level unlock gates on `stars > 0`** — works today because completion always
  awards ≥1 star, but gating on existence would be safer.
- **`supabase_schema.sql` at root vs `supabase/migrations/`** — two places to
  look for schema truth.

---

## 8. Running it

```bash
npm install
cp .env.example .env.local     # fill in Supabase URL + anon key
npm run dev                    # http://localhost:3000
```

Apply the SQL in the Supabase dashboard:

1. `supabase_schema.sql` — fresh projects
2. `supabase/migrations/002_security.sql` — **required**; without it
   "Delete My Data" cannot remove the profile row

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve the build — **use this to test CSP** |
| `npm run lint` | ESLint |
| `npx playwright test` | Test suite (run `npx playwright install chromium` once first) |

The suite starts its own dev server on port 3002. For the `race` and `gameplay`
suites to mean anything, run them with real Supabase credentials in
`.env.local`; with placeholders the realtime channels never connect.

### Environment notes

- The Supabase project is `iznnnsio….supabase.co`. **The Supabase MCP connector
  available in these sessions is a different account** (it lists
  `Intrafluence-db` and `kentra database`) — it cannot introspect this project's
  database.
- The repo previously lived on an SMB share, which handed every file CRLF and
  made all 60 tracked files look modified. `.gitattributes` (`eol=lf`) fixes
  this permanently. Do not remove it.

---

## 9. History — the eight phases, and why

All merged; `newissue2.md` has the detail.

| Phase | What | Why it mattered |
|---|---|---|
| 1 | Grid geometry | Missing `gridTemplateRows`; board collapsed to 106px; highlight 96.7px off |
| 2 | Multiplayer | Broadcast payload nesting; positional player identity; engine-dependent shuffle |
| 3 | Audio | Replaced 1.2 MB of mislabelled WAVs with synthesis |
| 4 | Security & data | CSP, real data deletion, best-score retention, timezone |
| 5 | Performance | 3.4× raster, 108× module load, tiled grain |
| 6 | A11y & responsive | Full keyboard play, nav decoupled from a hardcoded width |
| 7 | Gameplay | Co-op mode, timer, hints, sound/haptics, real stats |
| 8 | Cleanup | Dead code, all `any` removed, docs consolidated |

Then: PWA icons (they had 404'd since the start), favicons, the CSP dev fix, the
`allowedDevOrigins` fix, and the UI round from the user's screenshots (desktop
progress bars, desktop nav, phone level path, phone in-game nav, guest sign-in).

---

## 10. Verification habits that paid off

Offered because they caught things reading alone did not:

- **Measure in a real browser.** The grid bugs were found by reading computed
  styles on the live site, not by reading CSS.
- **Watch the wire.** The multiplayer diagnosis came from a raw WebSocket joined
  to the same Supabase room, which proved frames were sent correctly and moved
  the search to the receive side.
- **Simulate the generator.** Porting it to Python and running 300 seeds per
  theme found a word that could *never* be placed (9 letters, 8×8 grid) in 100%
  of easy race puzzles.
- **Static checks are not a type check.** Imports resolving and props matching
  told me nothing about `const existing` being declared twice in one scope —
  only the build caught that.
