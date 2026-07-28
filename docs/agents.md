# AGENTS.md — NhakoSearch

*Updated: added optional Google accounts, a level path + daily challenge, in-race banter chat,
PWA installability, and a heavier motion system. §2.3 revises the earlier "no accounts" rule —
read it before touching auth code.*

*Updated again after auditing the first live build at search.nhako.com, which shipped with:
puzzles that never regenerate (same grid on every load), a word pool too small to avoid repeats,
locked Level Path nodes wired as real `href="#"` links, and emoji standing in for the app's
custom illustration. §5 and §9 below now spell out the exact rules that close each of these gaps
— read them before writing any puzzle-generation, routing, or icon/illustration code.*

This file tells any AI coding agent (Claude Code, Cursor, Copilot, etc.) how to work in this
repository. Read it alongside `design.md` (visual/UX spec) and `plan.md` (roadmap/architecture/
data model) before making changes — don't re-derive decisions already settled in those files.

## 1. What this project is
NhakoSearch is a word-search game for mobile and tablet, installable to the home screen, built
by one person for themselves and their girlfriend to play together. It has:

- **Standard mode** — classic solo word search.
- **Level Path** — a Candy-Crush-style map of curated levels across themed chapters, with 0–3
  star ratings and a Daily Challenge.
- **Race mode** — realtime multiplayer (built for 2, extensible) where each player gets a word
  list sized to their own chosen difficulty and a shared countdown timer, plus quick-tap banter
  chat.
- **Optional accounts** (Google Sign-In) so progress, stars, and the Butterfly Collection sync
  across devices; a Guest mode with local-only progress remains available.

Hosted at **nhako.com**.

## 2. Non-negotiable constraints
Follow these on every task, no exceptions:

1. **$0 cost, forever.** Only use services with a genuinely free tier (see §3). Never add a
   paid API, paid font, paid asset, or anything that asks for a credit card.
2. **Not built for scale.** This serves a handful of concurrent players (realistically 2). Do
   not add infrastructure for load it will never see — no queues, no Redis, no Kubernetes, no
   extra CDN layers, no premature caching.
3. **Accounts are optional and password-free.** Sign-in is Google-only via Supabase Auth — never
   build custom email/password flows, "forgot password" screens, or store credentials yourself.
   Guest mode (local-only progress) must always remain available for anyone who doesn't want to
   sign in.
4. **No ads, no analytics/tracking scripts, no data resale.** This is a private hobby project
   between two people, not a product.
5. **No lives, energy timers, or purchasable skips on the Level Path.** The star system measures
   quality, not gatekeeping — a level can always be completed. Don't reintroduce Candy Crush's
   monetization mechanics just because the map/star structure is inspired by it.
6. **Chat is never persisted.** Banter/chat messages are live-broadcast only (see §5) — don't add
   a `chat_messages` table or any chat history/logging.
7. **Mobile and tablet first.** Design and test at phone and tablet breakpoints before desktop.
   Touch interactions (drag/tap-to-select letters) are the primary input method.
8. **Match `design.md`.** Colors, type, the "butterfly garland → collection" motif, the shape/
   shadow/icon rules in `design.md` §4, and the motion system in `design.md` §6 — don't
   substitute a generic UI-kit look or generic easing because it's faster to ship.
9. **The floating nav and signature footer are global chrome, not per-page decisions.** Per
   `design.md` §7 and the sitemap in §8, they render from a shared layout, not copy-pasted into
   each route — a screen missing the nav (outside the explicitly listed exceptions) or the
   account avatar not being tappable from anywhere is a bug, not a style choice.
10. **Respect copyright.** Ambient sound assets must be CC0 or explicitly free-for-use, per
   `plan.md` §10. Never bundle a file whose license is unclear.

## 3. Tech stack (already decided — don't re-litigate)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Static/PWA-friendly, deploys natively on Vercel |
| Styling | Tailwind CSS | Fast to hand-tune to the design tokens in `design.md` |
| Animation | Framer Motion | Free, MIT-licensed; needed now that motion (springs, shared-element transitions, gestures) runs throughout the app, not just in one place |
| Realtime multiplayer | Supabase Realtime (Broadcast + Presence) | Free tier gives huge headroom for 2 players; also carries `chat_message` events (broadcast only, never persisted) |
| Auth | Supabase Auth — Google provider only | Free, part of the same Supabase project, no passwords for us to manage |
| Persistence | Supabase Postgres — 6 small tables, all RLS-scoped to `auth.uid()` | See `plan.md` §5 for the exact schema (profiles, level_progress, daily_challenge_log, butterfly_collection, race_history) |
| Hosting | Vercel (Hobby/free plan) | Free custom domain + SSL, zero-config Next.js deploys |
| Domain | nhako.com (already owned) → DNS → Vercel | |
| Audio | Web Audio API (native browser) | No library needed to loop/mix 4 ambient tracks |
| PWA | Web App Manifest + Service Worker | Installable to home screen, offline-friendly caching of shell/word-lists/audio |

Don't introduce Redux/Zustand/heavy state managers unless a real need appears — React state +
Context (settings, sound, auth session) is enough at this scope.

## 4. Repo structure (target)
```
/app
  page.tsx                    home / dashboard
  /sign-in                    Google sign-in + guest entry
  /level-path                 level map
  /level-path/[levelId]       level gameplay (shares components/game with Standard)
  /daily                      daily challenge
  /play/standard/[...]        standard (free play) mode
  /play/race/[roomCode]       multiplayer race mode
  /profile                    stats + butterfly collection
  /settings                   appearance, sound mixer, account
/components
  /game                       grid, letter-cell, word-list, timer
  /level-path                 map, level-node, path-hop animation
  /multiplayer                lobby, room-code entry, race-progress (garlands), chat tray
  /nav                        FloatingNav (global chrome, see design.md §7.1) + its minimized/pause variant
  /footer                     SignatureFooter (global chrome, see design.md §7.2)
  /ui                         buttons, cards, doodle borders — themed per design.md
  /sound                      SoundMixer, useAmbientAudio hook
  /motion                     shared spring config, page-transition wrappers
/lib
  /puzzle                     grid generator, word placement, seeded RNG
  /levels                     chapter/level definitions, star-threshold logic
  /daily                      date-seed logic, streak calculation
  /multiplayer                Supabase client, channel + chat event types
  /auth                       Supabase Auth helpers, guest-mode local store, claim-progress flow
  /words                      theme word-list JSON files
/public
  /audio                      the 4 CC0 ambient loops + ATTRIBUTIONS.md
  manifest.json, icons/       PWA assets
design.md
plan.md
agents.md
```
Keep game logic (`/lib/puzzle`, `/lib/levels`, `/lib/daily`) framework-agnostic and
unit-testable — no React imports there.

## 5. Conventions
- **TypeScript strict mode on.** No `any` unless truly unavoidable.
- **Puzzle generation is a pure function:** `generateGrid(words, difficulty, seed) => Grid`.
  Same seed + inputs always produce the same grid — but **the seed source must match the mode,
  not be constant**:
  | Mode | Seed source |
  |---|---|
  | Standard (free play) | A fresh random value generated client-side on every "New Puzzle" action — never derived from the URL, difficulty name, or anything else that stays constant |
  | Level Path | Fixed per `levelId` — same level should always offer the same word list, that's intentional curated content, not a bug |
  | Daily Challenge | Fixed per calendar date |
  | Race mode | Generated once at room creation, then broadcast to both clients |

  If you're ever unsure, the test is: reload the same URL twice with no user action in between —
  Standard mode must give a different puzzle, Level/Daily/Race must give the same one.
- **Word pools must be large enough to avoid repeats.** Each theme needs 150–300 words (see
  `plan.md` §8), not the 5–10-word placeholder lists from the first build. Track the last 3–5
  word-sets played (session memory is enough, no table needed) and exclude them from the next
  random draw in Standard mode.
- **No `href="#"` or other dead/placeholder links, ever** — not even for locked content. A
  locked Level Path node is a visually-locked, non-interactive element (`<button disabled>` or a
  `<div>` with an aria-disabled state), not an anchor tag. Placeholder hrefs pollute browser
  history and are a direct cause of broken back/forward behavior.
- **Every screen the player can reach must be a real Next.js route**, not a client-state view
  swap. If the browser back button wouldn't take the player to the previous screen, it's built
  wrong — this applies to modals/sheets too where reasonable (e.g. the Level Info sheet can use
  a route-backed intercepting route or at minimum push history state on open).
- **No emoji as final UI art.** The butterfly garland, doodle borders, and other illustration
  called for in `design.md` must be real SVG assets — not `🦋` or other emoji standing in for
  them. Emoji is acceptable only as a temporary, clearly-commented `// TODO: replace with SVG`
  placeholder during early development, never in a "done" feature.
- **Multiplayer events** go over one Supabase channel per room, named `room:{roomCode}`. Keep
  the event contract small and explicit:
  - `player_joined { playerId, name }`
  - `difficulty_set { by: leaderId, difficulty }` — leader-only, per `design.md` §9.9
  - `countdown_start { startAt }` — **both clients must render the 3-2-1-GO countdown computed
    from this shared timestamp; the leader's local UI starting a countdown without broadcasting
    this event (so the guest skips straight to live gameplay with a head start) is a confirmed
    bug from live testing, not a hypothetical**
  - `game_start { startedBy }`
  - `word_found { playerId, word, timestamp }`
  - `timer_sync { endsAt }`
  - `game_over { winnerId }`
  - `chat_message { playerId, type: 'quick' | 'text', content, timestamp }` — broadcast only,
    never written to a table (see constraint §2.6). **The full `content` must render on the
    receiving client, not just the sender's name/id** — confirmed broken in live testing (only
    the sender label showed, message text was dropped).
  - `room_closed { reason: 'leader_left' | ... }` — **the receiving (non-leader) client must
    treat this as mandatory**: immediately redirect to the lobby/home rather than staying
    connected to a dead room. Confirmed via live testing that a guest can currently get stuck in
    an orphaned session when the leader leaves — this event existing in the code isn't enough,
    the client-side handler that reacts to it must actually run.
- **Every new Postgres table gets an RLS policy scoped to `auth.uid()`** before it's used, no
  exceptions — this is the one place a bug could leak data between the two accounts on this app.
  Test each policy by confirming you cannot read the other user's row from your own session.
- **Guest mode mirrors the same data shape in `localStorage`** as the signed-in tables, so
  gameplay code doesn't need separate branches for guest vs. signed-in. On sign-in, run the
  one-time "claim" merge described in `plan.md` §5 rather than discarding local progress.
- **Motion:** define one shared spring config (per `design.md` §5) and reuse it everywhere via
  Framer Motion — don't hand-tune a new easing curve per component. Every new interactive
  element must also work correctly with `prefers-reduced-motion` (fallback to opacity fades).
- **Sound engine:** one `AudioContext`, one `GainNode` per ambient track (lofi/rain/wind/birds)
  feeding a master `GainNode`. Volumes are 0–1 floats persisted to `localStorage` (per-device is
  correct here, not a bug — sound preferences aren't part of account sync).
- **Styling:** Tailwind utilities + the CSS variables for the design tokens in `design.md`.
  Reference the variables — don't hardcode hex values inline.
- **Commit small.** Each system (grid gen, level path, daily challenge, auth, sound mixer, race
  rooms, chat) should be independently testable before the next is layered on.

## 6. Commands (once the app is scaffolded)
```
npm run dev       # local dev server
npm run build     # production build (same one Vercel runs)
npm run lint      # lint before committing
npm run test      # unit tests for /lib/puzzle, /lib/levels, /lib/daily, /lib/multiplayer contracts
```

## 7. Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
Store in `.env.local`; never commit it. Google OAuth client ID/secret are configured inside the
Supabase dashboard (Authentication → Providers → Google), **not** as separate app env vars — the
app only ever talks to Supabase. The anon key is safe for client exposure by design as long as
every table's RLS policy is correctly scoped (§5).

## 8. What NOT to do
- Don't build custom email/password auth, "forgot password" flows, or store credentials —
  Google Sign-In via Supabase Auth only.
- Don't add Stripe/payments/"upgrade" prompts — this app is free, full stop.
- Don't add lives, energy timers, or purchasable skips to the Level Path.
- Don't persist chat messages to a database — broadcast only, per §2.6.
- Don't reach for a paid AI/TTS API to "enhance" the game — stay on free tiers.
- Don't introduce copyrighted lyrics/music or unlicensed sound clips — verify license per
  `plan.md` §10 before adding any audio file.
- Don't design new screens without checking `design.md` first — the doodle/butterfly/pink
  identity and the shared motion system should stay consistent as features are added.
- Don't over-build the multiplayer backend for concurrency it will never see — 2–4 players in a
  room is the ceiling worth designing for.

## 9. Definition of done for a feature
- [ ] Works on a real phone-sized viewport (not just a resized desktop browser window)
- [ ] Works in both light and dark mode
- [ ] Works correctly with `prefers-reduced-motion` enabled
- [ ] No console errors/warnings
- [ ] No new paid dependency or paid API introduced
- [ ] Matches the relevant section of `design.md`
- [ ] If it touches a Postgres table: RLS policy in place and verified (you can't read the other
      account's row)
- [ ] If it touches multiplayer: tested with two actual browser tabs/devices racing each other
- [ ] If it touches puzzle generation: reloaded the same Standard-mode URL twice and confirmed
      the grid/words are different both times; reloaded a Level Path or Daily Challenge URL
      twice and confirmed they're the *same* both times
- [ ] Pressed the browser back and forward buttons through the new screen(s) and confirmed they
      land where a person would expect — not on a blank/loading state or a stray `#` entry
- [ ] Grepped the diff for emoji used as UI icons/illustration (they should be real SVG assets)

## 10. If you are Antigravity CLI (agy) specifically
- **Switch off the default model for design/spec-heavy tasks.** Run `/model` and pick Claude
  Opus 4.8 or Sonnet 4.6 before reconciling `design.md`, `plan.md`, and this file against the
  codebase — the default Gemini 3.5 Flash is tuned for fast, cheap iteration, not for holding
  three interlocking spec documents in mind at once. Switch back to Flash afterward for small,
  self-contained edits.
- **Run `/planning` before any task that touches more than one screen or system.** Show the plan
  before writing code — the seed-per-mode table in §5 and the sitemap in `design.md` §8 exist
  specifically so a misread gets caught at the planning stage, not baked into a few hundred lines.
- **Turn on `/browser` for any UI work and self-verify before reporting done.** Actually open the
  built screen and check it against `design.md` §4 (shape/shadow/icon rules) and §9 (per-screen
  spec) — don't report a screen complete on the strength of the code looking plausible.
- **When given a bug list, fix exactly what's named** against the referenced section numbers,
  rather than doing a broad unscoped "improve the UI" pass — this repo's history has a pattern of
  small named defects (a hardcoded seed, a placeholder `href="#"`, an emoji standing in for
  SVG art) that a scoped fix catches and a vague one doesn't.
- **Check the Definition of Done (§9) explicitly before ending a task**, including running the
  reload-twice puzzle test and the back/forward test yourself — don't leave that verification to
  the human.

## 11. Round 4 additions (post-README/video audit)

- **No native browser dialogs** (`window.confirm`, `alert`, `prompt`) anywhere in the shipped
  UI — every confirmation is a custom Framer-Motion sheet matching `design.md` §4. This was
  found in the current nav's quit-confirmation and must be replaced.
- **Produce `ROUTING_MAP.md`** as part of this round's audit: for every screen, enumerate every
  tap target (button/link/card) and its exact destination or state change. This repo has full
  code visibility that a document alone can't guarantee stays accurate — generate it from the
  actual current routes/handlers, not from `design.md`'s sitemap description.
- **Use the existing Playwright setup, not just `/browser`, for anything with a pass/fail
  condition.** Per the README, Playwright is already in this repo for UI regression/viewport
  testing — write or extend a test for each bug in this round (e.g. "reload Standard mode twice,
  assert the word list differs," "open Race room in two contexts, change difficulty in one,
  assert the other reflects it within 1s without a reload," "drag-select a word, screenshot
  mid-drag, assert a highlight is visible"). `/browser` is for visual/UX judgment calls;
  Playwright is for anything with a concrete assertion — use both, don't substitute one for the
  other.
- **Dead-code cleanup runs last**, after this round's functional fixes are in and verified —
  see `plan.md` §15.8.
