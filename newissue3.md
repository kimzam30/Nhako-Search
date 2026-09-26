# NhakoSearch — Full Audit (newissue3)

**Date:** 2026-09-26 · **Tree:** `main` @ `a16d602` + the 19 uncommitted files from 2026-08-11
**Rule for this document:** every finding below was reproduced by a tool run
(build, type-check, lint, `npm audit`, Playwright against a **production build**,
axe-core, live Supabase queries/advisors, or a script that imports the real
generator). Anything only read from source, and not executed, is in §6 and says so.

---

## 0. Toolchain results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors** |
| `npm run build` | **Passes** — 12 routes, 3.3 s compile |
| `npx eslint .` | **20 problems (11 errors, 9 warnings)** — §5 |
| `npm audit` | **8 vulns: 1 critical, 6 high, 1 moderate** — §1.1 |
| Full Playwright suite vs `next start` | **65 passed / 7 failed** (was 63/9 vs `next dev`). All 7 failures are stale tests, not product bugs — §4 |
| Targeted audit probes (18, written for this audit) | all executed; results quoted inline |
| axe-core, 10 routes × light/dark | 6 rule types violated — §2.6 |
| Supabase security advisor | 1 WARN (leaked-password protection off — irrelevant, Google OAuth only) |
| Supabase performance advisor | 19 `auth_rls_initplan` WARN, 2 unindexed FKs, 3 unused indexes |

---

## 1. High

### 1.1 `next@16.2.10` has a **critical** advisory
`npm audit`: `next` 9.3.4-canary.0 – 16.3.2 → *Unauthenticated RCE in Image
Optimization API (AVIF)*, *RCE on Windows-hosted servers*, plus middleware bypass,
SSRF, DoS, cache confusion. Transitive `postcss` (4 advisories) and `sharp`
(libvips/libheif CVEs). Fix: `next@16.3.6` (+ `eslint-config-next@16.3.6`).
RM 0. Supersedes F5 (which only knew about postcss/sharp).

### 1.2 A third player can join any room and hijack a live race
Reproduced (probe R3): leader + guest start a race; a third client opens the
same code. The late joiner is admitted to the lobby, and **the leader's
in-race opponent bar switched to the intruder** (`aria-label="Late"`).
`useRaceRoom` presence sync takes whichever non-self key it iterates last
(`useRaceRoom.ts:228-235`); there is no 2-player cap. The real partner's
progress is then ignored by the leader, who is also the one who scores timeouts.
Probe R2: a third client joining a *lobby* is also admitted (the leader's card
did not flip during a 4 s sample, but nothing stops it).

### 1.3 Reloading mid-race strands the guest
Reproduced (R1): guest reloads during a race → lands in **Round 1 lobby with
"Ready Up"**, 0 grid cells, while the leader keeps racing (timer 2:22). There is
no resync of `status/seedStr/startTime` for a (re)joining client. The guest
cannot get back in; the leader wins on timeout.

### 1.4 URL with an unknown difficulty crashes the page
Reproduced (A2): `/play/standard/garden/extreme` → *"This page couldn't load"*,
page error `Cannot read properties of undefined (reading '0')`. `diff` comes
straight from the URL (`[...slug]/page.tsx:26`); `generateGrid` has no default
branch so `directions` is `[]` and `dir[0]` throws (`generator.ts:115-118`).
Also reproduced in isolation via the real generator.

### 1.5 Pausing ambience does not stay paused
Reproduced (A6, instrumented `AudioContext`): mixer OFF → context `suspended`.
One missed swipe → context **`running`** while the mixer still shows **OFF**.
`playSfx` calls `ctx.resume()` (`AmbientAudioProvider.tsx:104`) on the shared
context that the ambience graph is also connected to; `stopAmbience` only
suspends it. Any game sound restarts the music the player paused.

---

## 2. Medium

### 2.1 Nav bar does full page reloads (and kills ambience)
Reproduced (A5): a JS marker on `window` **does not survive** a nav-bar click;
it **does** survive a `<Link>` click. `FloatingNav` uses raw `<a href>`
(`FloatingNav.tsx:168`, `NavLink`), which is also lint error
`no-html-link-for-pages`. Every nav tap re-downloads the app and tears down the
audio provider, so ambience stops on every navigation. The home cards do the
same via `window.location.href = ...` (`app/page.tsx` Daily/Level cards).

### 2.2 Nav links have no accessible name
Reproduced (A5 + axe `link-name`, serious, 46 nodes): all 5 nav anchors have
empty names (`/daily`, `/level-path`, `/`, `/play/race/lobby`, `/sign-in`), plus
the home avatar link. Icon-only, no `aria-label`.

### 2.3 Home and Profile show a dead streak as alive
Reproduced (A3): guest last played 2026-09-16, stored streak 5 →
**home = 5, profile = 5, daily page = 0.** Home (`app/page.tsx:130-140`) and
profile (`profile/page.tsx:79-80`) print the raw stored `streak_count`; only
the daily page runs `resolveStreak`. Same for signed-in users (raw column read).

### 2.4 Butterfly collection hides everything past 30
Reproduced (A4): 45 stored → **30 rendered**, no paging/"+15". With 360 levels
plus dailies, a steady player loses sight of most of their collection.
`totalSlots = 30` (`profile/page.tsx`).

### 2.5 Duplicate word occurrences on generated grids
Measured with the real generator over all 360 levels: **14 levels** contain a
placed word that also appears a second time elsewhere (e.g. `c1-l1` EGG,
`c1-l17` MOSS, `c2-l33` TEA). Reproduced in-browser (A7): swiping the *decoy*
diagonal EGG at (4,5)→(6,7) on c1-l1 **counted as found** ("5 left"), while the
highlight is drawn on the *real* EGG in row 7. Cause: random fill letters are
not checked against the word list, and `commitSelection` matches by string.
Pools also contain substring pairs (RAIN⊂DRAIN, READ⊂BREAD, STAR⊂STARE, 12 in
`standard/easy`) which produce the same effect whenever both are drawn.
Free play: 3/9000 simulated puzzles also came up short of the promised word count.

### 2.6 Accessibility (axe-core 4.x, production build)
| Rule | Impact | Where |
|---|---|---|
| `button-name` | critical | 29 locked level buttons on `/level-path` (icon only) |
| `label` | critical | 7 range sliders on `/settings` have no label |
| `link-name` | serious | nav + avatar links, 9 routes |
| `color-contrast` | serious | light 24 nodes (e.g. stat labels 3.99:1); **dark: "Play Now" 1.83:1** |
| `landmark-one-main`, `region` | moderate | no `<main>` on any route |

Also unlabelled by inspection: chat trigger button, profile/level-sheet close buttons.

### 2.7 Service worker: offline is broken, cache grows without bound
Reproduced (A9b, SW controlling the page):
- **Offline reload → blank page** (request for `/` fails). `sw.js` bypasses any
  request with `cache: 'no-cache'`, which is what a reload is.
- **Offline navigation to `/daily` renders the home page** under the `/daily` URL
  (fallback `caches.match('/')`).
- After two page loads the cache held **17 entries, 13 of them `?_rsc=` payloads.**
  An offline fetch of a cached RSC URL still returned the SW's **503**, i.e. the
  entries are never served (Next's `Vary` headers) yet are never evicted.

### 2.8 Daily page header shows the wrong date outside UTC+8
Reproduced (A8): New York, 21:00 on Sat 26 Sep → header "**Saturday, Sep 26**",
puzzle seed/game day **2026-09-27**. The label uses the local date, the game uses
fixed UTC+8 (`daily/page.tsx:33` vs `daily/logic.ts`).

### 2.9 Daily "completed" screen always shows 3 stars
Reproduced (A10): 3 gold stars rendered; no star value is ever stored for a daily.

### 2.10 Splash delays first paint by ~1 s every new session
Measured (P1, prod, localhost): first visit **LCP 1028 ms**, return visit
**LCP 48 ms**. Same 275 KB JS either way. The 1.5 s splash in `app/page.tsx`
gates the whole home screen per browser session.

---

## 3. Database (live project `iznnnsiojfcbncrdqzyh`, read-only queries)

- **Rows:** profiles 0, level_progress 17, daily 5, butterfly 24, race 1, auth.users 3.
- **No profile row exists for any of the 3 users** — there is no signup trigger;
  a row is only written if someone edits their name. `getUserProfile` uses
  `.single()` (`lib/auth/profile.ts:6`), so it errors on every call before falling back.
- **Duplicate butterflies: 0** — the 003 unique index is live and holding.
- **19 `auth_rls_initplan`** warnings (every policy) — mechanical
  `auth.uid()` → `(select auth.uid())` rewrite.
- **Unindexed FKs** `race_history.player_a`, `player_b` (both are filtered on by
  the profile page's `or(...)` query and by Delete-My-Data).
- **Schema drift:** `002_security.sql` creates `butterfly_collection_user_idx`;
  it does not exist in production (harmless — the unique index covers it).
- `race_history` DELETE policy lets **either** player delete a shared row, so a
  guest-turned-user wiping their data also deletes the leader's record.
- Table **`tools_feedback`** (another app) lives in this project's `public`
  schema. RLS on, insert-only for anon, flood-guard trigger — fine, but it
  shares NhakoSearch's free-tier quota and blast radius.
- Security advisor: only "leaked password protection off" (not applicable).

---

## 4. The 7 remaining suite failures are stale tests (triaged)

| Test | Why it fails | Product bug? |
|---|---|---|
| `race.spec.ts:53` | expects text `Diff: hard`; UI now says `Race · hard` | No |
| `gameplay.spec.ts:80` | expects `nhako_audio_volumes` written on a fresh load; persisting is now skipped until the user changes a slider (intentional fix) | No |
| `gameplay.spec.ts:93` | expects "Start Together" but the guest never readies up, so the button says "Waiting for Partner..." | No |
| `gameplay.spec.ts:112` | `[data-x="0"][data-y="0"]` matches 2 elements — the partner board is mounted (CSS-hidden) in co-op | No (but that hidden board is wasted work in co-op) |
| `gameplay.spec.ts:188` | seeds `lastDate = today`, so `/daily` shows the "completed" screen, which has no calendar | No |
| `ui.spec.ts:51` | waits for `div.fixed.bottom-6`; nav is `.floating-nav` | No |
| `ui.spec.ts:94` | counts `svg line`; loops are `<path>` now | No |

**Security suite now passes (2 tests)** — they only fail under `next dev`, as predicted.
Conclusion on STATE.md's open question: the 5 "untriaged race/gameplay failures"
were test drift, not product bugs.

---

## 5. Lint (20)

11 errors: `set-state-in-effect` ×7 (`app/page.tsx:60`, `[...slug]/page.tsx:58`,
`settings/page.tsx:62`, `GameClient.tsx:129`, `ChatWidget.tsx:31,36`,
`AmbientAudioProvider.tsx:111`), `no-unescaped-entities` ×3, `no-html-link-for-pages` ×1 (= §2.1).
9 warnings: unused vars ×6, `no-img-element` ×3 (avatars; intentional — Google CDN, `referrerPolicy`).

---

## 6. Source-verified only (not executed — say so before relying on them)

These need a signed-in Google session or two real devices, which this audit did
not create.

- **Guest→account merge can demote and lose progress** (`lib/auth/merge.ts`):
  levels are upserted with the *guest* stars/time, overwriting a better server
  row; upsert errors are not checked (supabase-js returns, it does not throw),
  yet `nhako_merged=true` is set and local data deleted regardless; and the
  `nhako_merged` flag is never cleared, so a second guest session is never merged.
- **F4 still present:** reconcile loop returns unless `lobby|countdown`
  (`useRaceRoom.ts:363`).
- **F6 still present:** `sort(() => 0.5 - Math.random())` at `[...slug]/page.tsx:46`.
- Settings delete message "Nothing else was touched" is false (known).
- Level numbering: level path shows the global counter ("Level 31"), home shows
  per-chapter ("Rainy Day - 1") for the same level.
- Level locks are UI-only; `/level-path/c12-l360` opens directly.
- Race countdown/clock use each device's own clock against the leader's
  `startAt`; skewed clocks show different timers (leader alone decides timeouts).
- Free play win overlay says "Level Complete!".
- Unguarded `JSON.parse(localStorage...)` in 13 places — one corrupted key
  throws on that page.

## 7. Not checked

- "Delete My Data" end-to-end (needs OAuth).
- Real two-device race over mobile networks; ChatWidget/nav overlap on a phone during a race.
- Lighthouse (not installed; LCP/JS measured with Playwright instead).

---

## 8. Resolution (2026-09-26, after "ready boss")

Everything below was re-verified by running it against a production build
(`next build && next start`), not by reading the diff.

| Finding | Status | Evidence |
|---|---|---|
| 1.1 critical `next` advisory | **Fixed** | `next@16.3.6`; `npm audit` → 0 vulnerabilities |
| 1.2 third player hijacks a race | **Fixed** | leader seats one guest; a third client sees "Room … is full", opponent unchanged (R2, R3, F3) |
| 1.3 reload strands the guest | **Fixed** | leader publishes the round in its state; guest reload lands back on the same board with its finds (F2, R1) |
| 1.4 unknown difficulty crash | **Fixed** | validated + canonical redirect; generator defaults to easy (A2) |
| 1.5 sfx restarts paused music | **Fixed** | separate AudioContext for effects (A6) |
| 2.1 nav full reloads | **Fixed** | TabBar uses `<Link>`; JS state survives navigation (A5) |
| 2.2 nameless nav links | **Fixed** | Daily / Levels / Home / Race / You (A5, axe) |
| 2.3 dead streak shown | **Fixed** | home = daily = profile = 0 for a lapsed streak (A3) |
| 2.4 collection capped at 30 | **Fixed** | 45/45 rendered, newest first (A4) |
| 2.5 decoy words | **Fixed** | generator re-rolls filler; selection matches by position. 14 → 2 levels still have an all-placed-letter repeat, which no longer counts (A7) |
| 2.6 accessibility | **Fixed** | axe: 0 violations, 10 routes × light/dark |
| 2.7 service worker | **Fixed** | offline reload renders; unvisited page → `/offline.html`; 0 RSC entries cached; `/_next/static` cached so pages hydrate offline |
| 2.8 wrong daily date | **Fixed** | label from the game day (A8) |
| 2.9 always 3 stars | **Fixed** | real stars stored per device (A10) |
| 2.10 splash LCP | **Fixed** | splash removed |
| §3 RLS initplan ×19, FK indexes | **Fixed** | migration `004_rls_perf.sql` applied to production; 0 bare `auth.uid()` left, both indexes present |
| §3 `.single()` on profiles | **Fixed** | `maybeSingle()` |
| §4 seven stale tests | **Fixed** | suite 72/72 against the production build |
| §5 lint | **Fixed** | 20 → 0 |
| §6 merge demotes/loses progress | **Fixed in code, NOT exercised** | keeps best stars/time, only clears local data after every write succeeds, no permanent flag. Needs a signed-in session on a deployed build to exercise. |
| §6 F4 / F6 / delete message / numbering / locks / free-play title / JSON.parse | **Fixed** | reconcile runs all game; Fisher-Yates; honest message; per-chapter numbers; locks enforced on the URL; "Puzzle complete!"; `lib/storage.ts` |

**New bugs found while re-verifying, and fixed:**
- *Live, with a real signed-in client:* the first Ready was lost and the two
  players could get **different boards**. Root cause: Phoenix presence prepends
  the OLD meta on update and the reconcile loop read `entries[0]`, reverting the
  opponent every second. Fixed with a monotonic `rev` and newest-meta reads; the
  round's difficulty now comes from the leader's round, not the last-seen lobby
  state (F1: identical 64-cell boards after a last-second change).
- A burst of finds made Realtime **close the guest's channel** mid-race, so the
  leader never saw them finish. Fixed by coalescing publishes (broadcast ≤4/s,
  presence ≤1/1.5s) and rebuilding a channel the server closes (F4: guest "You
  won!", leader "Partner won!").
- My first rewrite regressed "leader leaves → guest to lobby" (4/5 never). Fixed:
  any leader broadcast counts as a sighting, and `pagehide`/`beforeunload` send
  `leader_away` to start the grace period at once. Close: 5/5 in ~8.07s; leader
  reload keeps the guest (2/2).
- Rematch (F5) and co-op completion (F6) re-verified end to end.

**Still not verified:** anything that needs the new code *deployed* with a real
Google session — merge-on-sign-in, Delete My Data, and a two-account race on
the live site. The live site still runs the old build until you deploy.

### Live two-account session (2026-09-26, deployed build `79e5fe4`)

Room HYXH8F: leader **namahakim** (driven by Claude in Chrome), guest **kimzam**
(played by hand). Verified on search.nhako.com:
- kimzam joined and appeared on the leader's screen; the round started.
- kimzam's finds reached the leader live (1/10 → 2/10 mid-round).
- Earlier, namahakim as guest vs a scripted leader: first Ready landed first
  time, identical 64-cell boards after a last-second switch to easy, reload
  mid-race rejoined the same board, and "You won!" / "namahakim won!" matched.
- Profile numbers for namahakim match the database exactly.

**New bug found live, fixed:** a co-op round that ran out of time showed
"Cleared together!" and awarded both players a Together butterfly (3/10 words
found; two rows `together-HYXH8F-2026-09-26` written). Co-op timeouts now end as
"Out of time" with a words-found line and no award (verified locally: 0 awards,
suite 72/72). **Needs a redeploy.** The two wrongly awarded rows are still in the
database — not deleted without your say-so.

### Final live checks (2026-09-26, deployed build `79c15e8`)

Confirmed first that the deployed room chunk contains the fix ("Out of time").
- **Two-account race, room WC62DG (Race, easy).** Leader **namahakim** (Claude
  in Chrome), guest **kimzam** (played by hand in the second Chrome). kimzam's
  join and Ready reached the leader; the leader's button went from "Waiting for
  partner…" to "Start Race"; both boards had the same first row; progress synced
  live (namahakim 1/6 vs kimzam 4/6 → 5/6); both screens ended "kimzam won!".
  `race_history` got exactly **one** row: `player_a` = namahakim, `player_b` =
  kimzam, `winner` = kimzam, `difficulty_a/b` = easy.
- **Co-op timeout, room 8L7JNY (Together, easy).** Leader namahakim (Chrome) vs
  a scripted guest (Playwright, live site), nobody found a word. Both screens:
  "Out of time — You found 0 of 6 words together." **No** `together-8L7JNY-*`
  butterfly row and **no** `race_history` row were written.
- **Grid dragging on the live site:** 12/12 words found by scripted drags, including
  drags sent as one single jump move. A missed drag during the race came from
  the extension's synthetic drag, not the game.

**Still open:** the two wrongly awarded `together-HYXH8F-2026-09-26` rows are
still in the database (checked 04:42 UTC) until you run the delete. Also not
verified: merge-on-sign-in and Delete My Data with a real Google session, and
real iOS/Android devices (everything was Chromium).


### Design re-check on the deployed build (2026-09-26, after `79c15e8`)

Re-ran the phone/tablet/desktop sweeps against search.nhako.com itself:
axe **0 violations** on 10 routes × light/dark; no horizontal overflow, no tap
target under 44px, tab bar on screen, across 6 viewports × 11 routes.

**New layout bug found (multiplayer only), fixed locally — needs deploy:**
the race/co-op screen kept a 512px column up to 1024px while the game already
put the word list beside the board from 768px, and on desktop the partner's
board took an equal half. Measured board widths, live → fixed:

| Viewport | Solo | Race (live) | Race (fixed) | Co-op (live) | Co-op (fixed) |
|---|---|---|---|---|---|
| iPad 820×1180 | 552 | **280** | 536 | **280** | 536 |
| iPad landscape 1180×820 | 520 | **184** | 480 | 520 | 520 |
| Desktop 1440×900 | 600 | **184** | 416 | 600 | 600 |
| Phone landscape 844×390 | 200 | 200 | 230 | 200 | 230 |

Every board fits the viewport without scrolling (landscape phone: board bottom
368–382 of 390). Also fixed: the race countdown/round screen had no h1 (axe
`page-has-heading-one`) — the game bar now titles it "Race"/"Together" — and the
desktop partner heading skipped a level (`heading-order`). Race round axe after
the fix: 0 violations at 1440/820/390, light and dark. Suite 72/72, tsc 0, lint 0.
Files: `app/play/race/[roomCode]/page.tsx`, `app/globals.css`.

### ui-ux-pro-max + appllama re-run (2026-09-26, same session)

Pre-delivery checklist and native laws re-checked mechanically. Passed as-is:
reduced motion (MotionConfig `reducedMotion="user"` + CSS), no emoji in chrome
(only chat quick-replies, which is content), one stated radius rule (hand-cut
radii, `docs/design.md` Rule 1), the one gradient is a functional fade behind
the pinned CTA, haptics on find/miss/win (Android), micro-interactions ≤300ms
except the rare win celebration, modal scrims 45%.

**Fixed (local, needs deploy):**
- *Back didn't close sheets.* The Android back button / iOS edge swipe / browser
  Back skipped straight past an open sheet — with "Leave this game?" open it
  left the game without the sheet answering. `Sheet` now pushes one same-URL
  history entry; Back closes the sheet; closing any other way pops the entry;
  navigating from a sheet waits for the pop (`afterSheetClosed`), so no dead
  duplicate steps. Verified (B1–B6): back closes the level, Leave, Sound and
  Delete sheets without a reload; tap/Escape leave history unchanged; Play level
  → back → map → back → home; Leave → map in one step; deep-linked Leave
  replaces to the parent; after Delete, back goes to Profile, not Settings.
- *Collection butterflies failed contrast in light mode* (stroke-only icons):
  Together 1.2–1.4:1, Daily 1.8–2.0:1, Garden/Cozy 2.8–2.9:1 on tiles. Now theme
  tokens `--wing-*` (light ≥4.0:1 on every tile, dark unchanged); rendered and
  checked in both themes.

After all fixes: suite 72/72, lint 0, tsc 0, axe 0 (10 routes × 2 themes + race
round at 1440/820/390 × 2 themes), overflow/tap-target sweep clean.
Files: `components/ui/Sheet.tsx`, `components/nav/GameBar.tsx`,
`app/level-path/page.tsx`, `app/settings/page.tsx`, `app/profile/page.tsx`,
`app/globals.css`, `app/play/race/[roomCode]/page.tsx`.
Not possible here: Appllama reference-screen study (MCP not connected) and a
real-device motion/60fps recording (no iOS simulator / Android device).

### Live re-verification of `cd6f65a` (2026-09-26 ~05:15 UTC)

- HYXH8F rows deleted by the user — confirmed (only the two genuine
  `together-XHRL4T-2026-07-29` rows remain).
- Live, passing: back closes every sheet with no reload and no duplicate steps
  (B1–B6); race board 536/480/416px on iPad/iPad-landscape/desktop (was
  280/184/184); co-op tablet 536px; race-round axe 0 at 1440/820/390 × 2 themes;
  drag 12/12.
- **Not live:** the deployed stylesheet (`3szb_4q9kwb62.css`, built 05:11) was
  generated from the OLD `globals.css` — no `--wing-*` tokens, no landscape
  board rule — while the JS is new. The committed file and a local build of the
  same commit both contain the rules. Likely a stale Vercel build cache.
  Effect: collection butterflies whose colour now comes from the missing tokens
  fall back to the text colour; landscape-phone board stays 200px.
  Fix: redeploy in Vercel with "Use existing Build Cache" unticked.

**Resolved after a cache-free Vercel redeploy** (stylesheet `3vfe2stx7um1a.css`):
all 7 butterfly colours render from the `--wing-*` tokens in both themes;
landscape-phone board 230px (bottom 368–382 of 390) solo/race/co-op; axe 0 on
10 routes × light/dark; overflow/tap-target sweep clean. Everything from this
session is now live and verified on search.nhako.com.
delete from public.butterfly_collection where butterfly_style_id = 'together-HYXH8F-2026-09-26' and user_id in ('27bacd6f-27dc-49b8-b8d6-01b522b0d0b1','88ccb7c3-d5c9-4000-842a-642b1ec1e53a');