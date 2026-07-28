# NhakoSearch — Full Repository Audit & Improvement Plan

**Audited:** 2026-07-28
**Branch:** `claude/word-search-audit-06c78f`
**Live target:** https://search.nhako.com (audited against production, not just source)
**Budget constraint:** RM0 — every recommendation in this document stays on free tiers.

---

## 0. How this audit was done

- Read 100% of the source: 37 TS/TSX files (~4,300 lines), `globals.css`, `supabase_schema.sql`, `sw.js`, `manifest.json`, all 6 word-list JSONs, Playwright tests, CI workflow.
- **Ported the puzzle generator to Python and ran 300 seeds per theme per difficulty** to measure word-placement failure rates empirically (§2.1).
- **Instrumented the live production site** at 375×812 (phone), 768×1024 (tablet) and desktop to measure real DOM box sizes, grid row alignment, and highlight-overlay drift (§1.1).
- **Ran a real two-client multiplayer session** against production (leader + guest in separate browser contexts) and reproduced the sync failure (§1.2).

Findings are labelled **[PROVEN]** (reproduced on production with measurements) or **[CODE]** (diagnosed by reading source; not independently reproduced).

---

## 1. P0 — Critical: these break the core experience

### 1.1 The word-search grid is broken on every device — one missing CSS line causes it **[PROVEN]**

This is the single highest-impact bug in the repo. It is the root cause of **all three** of the problems you named: grid size, word highlighting, and (partly) selection accuracy.

**Root cause:** `components/game/GridBoard.tsx:52-54` sets `gridTemplateColumns` but **never sets `gridTemplateRows`**:

```tsx
<div className="grid relative z-10 w-full h-full"
     style={{ gridTemplateColumns: `repeat(${grid.width}, minmax(0, 1fr))` }}>
```

Grid rows therefore auto-size to the text line-height instead of dividing the container. Measured live on `/play/standard/standard/hard` at 375×812:

| Measurement | Value |
|---|---|
| Grid container (square) | 172.5 × 172.5 px |
| Computed `grid-template-rows` | `21px` × 13 = **273px** |
| **Vertical overflow past the card border** | **+100.5 px** |
| Cell box | 13.3 w × 21 h (**not square**) |
| Cell font-size | 14px — **larger than the 13.3px cell** |

**Consequence A — the highlight lands nowhere near the letters.** The SVG overlay computes cell centres as `(y + 0.5) × (100 / grid.height)` against a `viewBox="0 0 100 100"` stretched over the *container*, i.e. it assumes uniform 13.3px rows. Measured drift between where a highlight is drawn and where the letter actually is:

| Row | Letter actually at Y | Highlight drawn at Y | **Error** |
|---|---|---|---|
| 0 | 10.5px | 6.6px | 3.9px |
| 4 | 94.5px | 59.7px | 34.8px |
| 8 | 178.5px | 112.8px | 65.7px |
| 12 | 262.5px | 165.8px | **96.7px** |

**Consequence B — pointer hit-testing selects the wrong row.** `GridBoard.tsx:55-64` uses the *same* faulty math (`cellY = Math.floor(y / (100 / grid.height))`), so dragging over a letter registers a different cell the further down the grid you go.

**Consequence C — `preserveAspectRatio="none"` compounds it.** Even once rows are fixed, non-uniform scaling distorts diagonal highlights and stroke widths.

**Fix:** add `gridTemplateRows: repeat(${grid.height}, minmax(0, 1fr))`, drop `preserveAspectRatio="none"` (or keep the viewBox genuinely square), and derive cell font-size from cell size rather than viewport (`clamp` on `vmin` is wrong for a fixed-size board).

### 1.2 The grid is 3–4× smaller than it should be **[PROVEN]**

`GridBoard` declares `aspect-square w-full max-w-[450px]`, but `GameClient.tsx:65-69` wraps it in `flex-1 … min-h-0` → `aspect-square h-full`. Because the inner box takes its **height** from the constrained flex row and then derives width from `aspect-square`, the board collapses to whatever vertical space is left over.

| Viewport | Actual grid width | Should be | Cell size (easy 8×8) |
|---|---|---|---|
| 375×812 phone | **106 px** | ~343 px | 13 px |
| 768×1024 tablet | **182 px** | 450 px | 23 px |

A 13px cell is roughly a quarter of the 44px minimum touch target. This is why the board feels cramped and why precise dragging is frustrating.

**Fix:** make the board sizing width-driven (`w-full max-w-[min(92vw,450px)] aspect-square`) and let the *page* scroll, rather than forcing the board into leftover flex height. Verify at 375 / 768 / 1024 / 1920.

### 1.3 Multiplayer state stops syncing after the initial join **[PROVEN]**

Reproduced live with two independent browser contexts in room `ZZ99`:

| Step | Expected | **Actual** |
|---|---|---|
| Guest joins | Both see each other | ✅ Works (presence snapshot) |
| Guest taps **Ready Up** | Leader sees `READY` | ❌ Leader stuck on `NOT READY` for 7.5s+ (polled 5×) |
| Leader's **Start Race** button | Becomes enabled | ❌ **Permanently `disabled=true`** |
| Leader picks **Hard** | Guest sees `Diff: Hard` | ❌ Guest stuck on `Diff: Medium` for 5s+ |

**A race can never be started through the normal UI.** The initial presence snapshot works; every subsequent update fails in *both* directions.

Three code-level defects, in likely order of impact:

**(a) Broadcast payloads are read at the wrong nesting level [CODE].** `supabase-js` v2 delivers the whole message `{ type, event, payload }` to `.on('broadcast', …)` callbacks. `lib/multiplayer/useRaceRoom.ts` reads fields off the top level everywhere:

```ts
.on('broadcast', { event: 'state_update' }, (payload) => {
  if (payload.id === userId) return prev;   // payload.id is undefined
  … { [key]: payload.state }                // payload.state is undefined
})
```

Same mistake at `countdown_start` (`payload.startAt`, `payload.seedStr`), `game_over` (`payload.winner`), and `chat_message` (`payload.content`, `payload.playerId`). Every one resolves to `undefined`. Needs `msg.payload.id` etc.

This also means that once a race *does* start, `seedStr` is `undefined` on the guest, so `GameClient` falls back to `'daily-seed-123'` — **the two players would be solving different grids** — and `startTime` is `undefined`, so the guest skips the countdown screen entirely (`raceState.startTime` is falsy → falls through to the playing branch with a broken timer).

**(b) Network side-effects run inside a `setState` updater [CODE].** `updateMyState` (line 194) calls `channelRef.current?.send(…)` and `.track(…)` *inside* `setRaceState(prev => …)`. React may invoke, defer, or discard updater functions; they must be pure. The presence `track()` fallback is therefore unreliable — which is why the presence path doesn't rescue the failed broadcast.

**(c) `playerA` / `playerB` are client-local labels, not global identities [CODE].** Both clients initialise `playerA` to *themselves* (line 31). So "playerA" means "me" on both machines. This makes the key-resolution ladder at lines 93-99 guesswork, and it causes a concrete data bug: `saveRaceHistory` guards with `if (user.user.id !== playerA) return`, which **both** signed-in clients pass → **duplicate `race_history` rows per match** → inflated Wins.

**Fix:** switch to a canonical `me` / `opponent` model keyed by user id, move all sends out of state updaters, unwrap `msg.payload`, and let the leader be the single writer of match history.

### 1.4 "New Puzzle" does nothing **[CODE]**

`lib/puzzle/useGameLogic.ts:5` generates the grid in a `useState` lazy initialiser, which only ever runs on mount:

```ts
const [grid] = useState<Grid>(() => generateGrid(words, difficulty, seedStr));
```

`GameClient` has no `key`, so when `/play/standard/[...slug]` calls `generateNew()` and passes fresh `words` + `seedStr`, the grid never regenerates — and `isWon`/`stars` never reset either. Clicking **New Puzzle** leaves the win overlay up over the identical puzzle.

**Fix:** `key={seedStr}` on `<GameClient>`, or regenerate in an effect keyed on `[words, difficulty, seedStr]`.

### 1.5 Race mode's word list can't fit its own grid **[PROVEN]**

`app/play/race/[roomCode]/page.tsx:61` hardcodes a 10-word list and slices it by difficulty. `BUTTERFLY` is 9 letters; **easy mode is an 8×8 grid**. Simulation over 300 seeds:

| Mode | Grid | Puzzles that silently drop a word |
|---|---|---|
| Race — easy | 8×8 | **300/300 (100%)** — always `BUTTERFLY` |
| Race — medium | 10×10 | 28/300 (9.3%) — `SPRING`, `FLOWER`, `CLOUDS` … |
| Race — hard | 13×13 | 0/300 ✅ |
| All 6 themed level pools (18 combos) | — | 0/300 ✅ |

The generator has no "word longer than the grid" check and no retry — it just gives up after N attempts and drops the word silently. The progress bar is driven by `total: raceWords.length` (6) while only 5 words exist, so **the bar caps at 83%** until the final jump. The themed level pools happen to be curated to fit, so this only bites race mode today — but nothing prevents it recurring.

**Fix:** validate `word.length <= min(width, height)` up front, retry the whole grid on failure, and always drive UI totals from `grid.placedWords.length`, never the requested list.

### 1.6 PWA is not installable — icons 404 **[PROVEN]**

`public/manifest.json` references `/icons/icon-192.png` and `/icons/icon-512.png`. Verified against production:

```
/icons/icon-192.png → 404
/icons/icon-512.png → 404
```

There is no `public/icons/` directory. Add-to-home-screen will fall back or fail. Also missing: `apple-touch-icon`, `theme_color` meta matching dark mode, and any `maskable` icon.

---

## 2. P1 — High: correctness, data integrity, and the audio system

### 2.1 The "lofi + ambience" audio is synthesized beeps, not music **[PROVEN]**

You asked for a lofi system with rain, birds and thunder. What ships today (`generate_audio.js`, still committed at repo root) is:

| File | What it actually is | Duration | Size |
|---|---|---|---|
| `lofi.mp3` | 3 sine waves (220/277/330 Hz) — a static chord drone | 4 s | 345 KB |
| `rain.mp3` | `Math.random()` white noise | 2 s | 172 KB |
| `wind.mp3` | Lightly filtered white noise | 2 s | 172 KB |
| `birds.mp3` | A 2500 Hz sine beep, once per second | 4 s | 345 KB |
| `thunder.mp3` | **Byte-identical to `rain.mp3`** (same md5) | 2 s | 172 KB |

They are also **not MP3s** — verified on production, `lofi.mp3` begins `RIFF…WAVE`: uncompressed WAV served as `audio/mpeg`. That's why 4 seconds costs 345 KB. A real 3-minute lofi loop as a 96 kbps MP3 is ~2 MB; these files are ~100× less efficient per second.

Two-second noise loops also have an audible seam every 2 seconds.

**`ATTRIBUTIONS.md` says the tracks are synthesized; the Settings → About panel claims "CC0 via FreeSound".** Those contradict each other — fix the copy.

**Free-tier fix (RM0):** source genuinely CC0 assets from Pixabay Audio or Freesound (CC0 filter) — 60–180 s seamless loops for lofi / rain / wind / birds, plus 3–4 distinct one-shot thunder claps. Encode to ~96 kbps mono MP3 (or Opus, ~48 kbps, with MP3 fallback). Keep total under ~5 MB, lazy-load on first interaction, and cache via the existing service worker. Details in §6.

### 2.2 Signed-in players lose their best star rating on replay **[CODE]**

`lib/levels/progress.ts` is inconsistent between the two storage paths:

```ts
// Guest path — correct, keeps the best:
saved[levelId] = { stars: Math.max(saved[levelId]?.stars || 0, stars), … }

// Supabase path — overwrites unconditionally:
.upsert({ user_id, level_id, stars, best_time_seconds: timeSeconds }, …)
```

Replay a 3-star level slowly and it drops to 1 star. `best_time_seconds` is likewise overwritten with the *latest* time, not the best. **Fix:** `GREATEST`-style merge (read-then-write, or a Postgres function).

### 2.3 The daily challenge mixes local and UTC dates **[CODE]**

`getDailySeed()` and `saveDailyChallenge()` build the date from **local** components; `checkDailyStreak()` normalises to **UTC midnight** for comparison. Near midnight (and for players in different timezones) this produces off-by-one streaks and a different "daily" puzzle per player. Also `Math.abs(todayDate - lastDate)` treats a *future* stored date as a valid streak. **Fix:** pick one timezone (UTC, or a fixed offset like UTC+8 for Malaysia) and use it everywhere.

### 2.4 Fabricated stats **[CODE]**

- `app/daily/page.tsx:19` — the 7-day calendar strip is explicitly `mockHistory`, derived from the streak number, not from real history. It cannot show a gap.
- `app/profile/page.tsx:325` — `wordsFound: (levels || 0) * 8` is a made-up multiplier, not a count.
- `race_history` has no `words_found`, so real per-match stats aren't recorded at all.

### 2.5 Room codes can be shorter than 4 characters **[CODE]**

`app/play/race/lobby/page.tsx:24` — `Math.random().toString(36).substring(2, 6)` yields fewer than 4 chars when the float's base-36 expansion is short (e.g. `0.5` → `"0.i"` → `"i"`). The join form *requires* exactly 4 characters, so the creator lands in a room nobody can join. There is also **no validation that a room exists** before joining — typing a wrong code drops you into a lobby that will never fill.

### 2.6 A guest who arrives before the leader is kicked instantly **[CODE]**

`useRaceRoom.ts:77-82`, in the presence `sync` handler:

```ts
if (!isLeader && !leaderIsPresent) {
  setTimeout(() => router.push('/play/race/lobby'), 0);
}
```

This fires on the **first** sync. If the guest opens the invite link before the leader's presence has propagated — or during any transient leader reconnect — the guest is bounced out with no message. Needs a grace period (e.g. only kick after the leader has been seen and then disappears for >5 s) and a user-facing explanation.

### 2.7 The win overlay hijacks race mode **[CODE]**

`GameClient` renders a `fixed inset-0 z-50` "Level Complete!" modal with a "Back to Home" link whenever the local puzzle is finished. Race mode passes `onComplete` but has no way to suppress the overlay — so finishing first covers the race screen with a solo-play modal instead of the race result. There is a `hideGarland` prop but no `hideWinOverlay`.

### 2.8 Partner's grid is reconstructed with the wrong difficulty **[CODE]**

`app/play/race/[roomCode]/page.tsx:256` passes `difficulty={them?.difficulty}` to `PartnerGridDisplay`, while the actual race uses `roomDifficulty` (the leader's). If the guest's stale local difficulty differs, the desktop side-by-side view renders a different-sized grid with different words than your opponent is really solving.

### 2.9 Missing CSS utilities — silently no-ops **[PROVEN]**

- `hide-scrollbar` is used in `app/play/standard/page.tsx:39` and `app/settings/page.tsx:126` but **is not defined** anywhere in `globals.css`, and Tailwind v4 has no such built-in. Scrollbars show on the horizontal theme pickers.
- `font-title` is used twice in `app/daily/page.tsx` (lines 40, 72) but only `--font-display`, `--font-body`, `--font-accent` are defined. The date renders in the default body font.
- `--font-accent` (Caveat) is **loaded and never used** — the "hand-written" accent font the design calls for is paying its download cost for nothing.

---

## 3. P2 — Security

Nothing here is catastrophic for a two-person app, but you asked for "full security".

| # | Issue | Detail | Fix (RM0) |
|---|---|---|---|
| S1 | **No security headers** | `next.config.ts` is empty. No CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. | Add a `headers()` block. Free. |
| S2 | **Race results are self-reported** | `race_history` RLS allows any authenticated user to insert a row with `winner = auth.uid()` and an arbitrary `player_b`. Wins are trivially forgeable from the browser console. | Restrict insert to `auth.uid() = player_a`, add a uniqueness/rate constraint, or accept it (2-player trust model) and document it. |
| S3 | **Duplicate history rows** | Both clients believe they are `player_a` (§1.3c), so both insert. | Single writer (leader only). |
| S4 | **`profiles` SELECT is self-only** | `USING (auth.uid() = id)` means you can never read your partner's display name from the DB — names travel only over ephemeral realtime payloads. | Add a policy exposing just `display_name`/`avatar_url`, or keep names in the realtime payload deliberately. |
| S5 | **Room codes are guessable** | 4 chars, `Math.random()` (not crypto), no auth on the channel. Anyone can join any room. | Use `crypto.getRandomValues`, 6 chars, and drop ambiguous glyphs (O/0, I/1). |
| S6 | **No input hardening on chat** | Only `text.slice(0, 50)`. Presets only today, but a free-text field is on the roadmap. | Validate server-side-ish: length, rate-limit, strip control chars. React escapes output, so XSS risk is low. |
| S7 | **Client-side-only rate limiting** | The 10-second room-creation cooldown lives in `localStorage` — cleared or bypassed trivially. | Acceptable for now; note it. |
| S8 | **`localStorage.clear()` on "Delete My Data"** | Wipes *all* origin storage including Supabase auth tokens, and never deletes the server-side rows. The button does not do what it says. | Delete the user's DB rows explicitly, then sign out and clear only `nhako_*` keys. |
| S9 | **No `.env.example`** | New environments have no documented required vars. `.gitignore` correctly excludes `.env*` — good. | Add `.env.example` with placeholder values. |
| S10 | **Service worker caches broadly** | `sw.js` cache-first for all same-origin GETs, including HTML. Stale-while-revalidate means users can run old JS against a new schema. | Version the cache on deploy; use network-first for navigations. |

**Verified good:** `.gitignore` covers `.env*`, `*.pem`, `*.key`; no secrets are committed; RLS is enabled on all five tables; the anon key is correctly public-by-design; the CI workflow guards against missing secrets.

---

## 4. P2 — Performance

| # | Issue | Detail | Fix |
|---|---|---|---|
| P1 | **SVG turbulence filter on every highlight, every frame** | `GridBoard` applies `filter="url(#sketch)"` (`feTurbulence` + `feDisplacementMap`, 3 octaves) to **two** `<motion.line>` elements per found word, re-rasterised during animation. This is the most expensive thing in the app on mobile GPUs. | Pre-render the sketch texture once, or drop the filter to a static `stroke-dasharray` wobble. |
| P2 | **Full-viewport noise overlay** | `body::after` is a `position: fixed; inset: 0; z-index: 9999` turbulence SVG over the entire app. It also sits above everything — a permanent extra composited layer. | Use a small tiling PNG/WebP, or `background-repeat` a 200×200 data URI without the live filter. |
| P3 | **345 KB of uncompressed WAV mislabelled as MP3** | §2.1. ~1.2 MB of audio for 14 seconds of content. | Real MP3/Opus loops; lazy-load. |
| P4 | **All 360 levels built at module load** | `lib/levels/data.ts` runs a nested loop generating 360 `LEVELS` entries + word shuffles at import time, in every bundle that touches it (including the home page). | Generate lazily per level id, or precompute to JSON at build time. |
| P5 | **`setInterval(…, 100)` driving React state** | `app/play/race/[roomCode]/page.tsx:52` re-renders the whole race screen 10×/second just to tick a clock, plus a second 250 ms interval in `useRaceRoom`. | Drive the timer with CSS/`requestAnimationFrame`, or tick once per second. |
| P6 | **Three Google font families** | Fredoka + Nunito + Caveat, and **Caveat is never used** (§2.9). | Drop Caveat, or actually use it and drop one of the others. `next/font` already self-hosts, which is good. |
| P7 | **No `loading.tsx` / Suspense boundaries** | Every page is `'use client'` and shows a bare "Loading…" string. Nothing is server-rendered, so first paint waits on the JS bundle. | Add route-level `loading.tsx` skeletons; move static shells to server components. |
| P8 | **No image optimisation config** | Avatars use raw `<img>` (`FloatingNav.tsx:177`, `page.tsx:136`, `settings/page.tsx:208`) from Google's CDN. | `next/image` with `remotePatterns`, or keep `<img>` and add `loading="lazy"` + explicit dimensions. |
| P9 | **Duplicate SVG `filter id="sketch"`** | When `PartnerGridDisplay` renders a second `GridBoard`, two elements share `id="sketch"` — invalid HTML; the first wins. | Unique id per instance, or hoist to a single `<defs>`. |

---

## 5. P3 — Dead code, hygiene, accessibility

**Dead / unused:**
- `components/motion/springs.ts` — `pageTransition` is exported and never imported.
- `app/play/race/[roomCode]/page.tsx` — `QUICK_BANTER` (line 17) is a duplicate of the one in `ChatWidget.tsx` and is unused here; `ChatSvg` and `AnimatePresence` are imported and unused.
- `lib/multiplayer/useRaceRoom.ts:100` — `const newState = …` assigned, never used.
- `components/nav/FloatingNav.tsx:40` — `isDailyGameplay` computed, never used. Lines 33-45 are a block of stream-of-consciousness comments ("Wait, daily could be…") that should be resolved into a decision.
- `generate_audio.js` at repo root — the script that produced the placeholder audio; should be deleted with the assets it made.
- `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` — Next.js starter leftovers.
- `playwright-report/index.html` and `test-results/.last-run.json` are **committed to git**; both should be gitignored.
- Root is cluttered with six overlapping process docs (`agents.md`, `design.md`, `plan.md`, `progress.md`, `round5-prompt.md`, `REBUILD_CHECKLIST.md`). Consolidate into `docs/`.
- 13 `console.*` calls and 6 `: any` annotations remain in app code.

**Tests:**
- `tests/race.spec.ts` uses `roomCode = 'TEST-' + …` (not the 4-char format the app enforces) and asserts on `.text-9xl`, but the countdown renders `text-[120px]` — **that selector cannot match**. `test-results/.last-run.json` claims "passed", which means it is stale.
- No test covers the grid-row overflow, the highlight alignment, or ready-up propagation — i.e. the tests miss every P0 bug found here.

**Accessibility (design.md targets WCAG-ish behaviour; current state):**
- The grid is **entirely keyboard-inaccessible** — pointer events only, no `tabindex`, no ARIA, no roles. Unplayable without a mouse/touch.
- Letter cells are `<div>`s, not buttons; no `aria-label` on the board.
- 13px cells fail the 44×44 minimum touch target by a wide margin.
- `motion.div` used for a collapsible in `settings` uses a literal `▼` character rather than an icon (inconsistent with the "custom vectors only, no emoji" rule in `design.md`) — and `QUICK_BANTER` ships 😤 and 🦋 emoji, also against that rule.
- No `prefers-reduced-motion` handling beyond `MotionConfig reducedMotion="user"` (good, but the CSS animations and the pulsing level marker bypass it).
- No focus-visible styling anywhere.

---

## 6. Improvements — the game and multiplayer

### 6.1 Core word-search feel
1. **Snap-to-line selection.** Lock the drag to the nearest of the 8 valid vectors from the anchor cell instead of requiring the pointer to land exactly. Massively improves small-screen feel.
2. **Haptics + sound on find.** `navigator.vibrate(20)` and a soft chime — currently finding a word is silent and unrewarded.
3. **Feedback for a wrong selection.** Today an invalid drag just vanishes; a short shake or red flash tells the player the app registered the attempt.
4. **Show the timer during solo play.** Stars are awarded on time (`<60s` = 3★) but the player can't see the clock.
5. **Hint system.** Reveal one letter of an unfound word on a cooldown; costs a star. Gives an out when stuck.
6. **Persist an in-progress puzzle** so a refresh or a phone call doesn't lose the board.
7. **Word list ↔ grid linkage.** Tapping a word in the list could flash its first letter; found words should strike through *in place* (already done) and re-order to the bottom.
8. **Difficulty should scale word count and grid together** — right now hard is 13×13 with only 10 words, so it's sparse and mostly filler letters.

### 6.2 Multiplayer — beyond fixing the sync
1. **Rematch that actually works.** Currently the Rematch button is `window.location.reload()` on one client only — the other player is left behind. Needs a `rematch` broadcast (it's documented in `ROUTING_MAP.md` but never implemented).
2. **Reconnect grace.** Guest ids are `'guest-' + Math.random()` regenerated on every mount, so a refresh makes you a brand-new player. Persist the guest id in `sessionStorage` and allow rejoining an in-progress race.
3. **Co-op mode** — one shared grid, both players' finds highlighted in different colours, working toward the same list. For a couple this is likely more fun than head-to-head.
4. **Handicap / asymmetric difficulty** so a stronger player can be balanced.
5. **Live opponent presence on the grid** — show a ghost cursor of where your partner is dragging.
6. **Free-text chat** (with the existing presets as a quick tray) plus emoji reactions on found words.
7. **"Together" butterflies.** The profile page already has a `together-` branch in its butterfly styling that nothing ever awards — wire it to co-op completions.
8. **Best-of-3 rounds** with a running score, instead of one-and-done.
9. **Room links.** Share `search.nhako.com/play/race/AB12` directly rather than reading a code aloud.

### 6.3 Ambient audio system (target design, RM0)
- **Channels:** Master, Lofi, Rain, Thunder, Wind, Birds — the mixer UI already has all six; only the assets and scheduling need work.
- **Assets:** CC0 from Pixabay Audio / Freesound. 60–180 s seamless loops, ~96 kbps mono MP3 (Opus where supported). Target < 5 MB total.
- **Crossfade looping.** A single `AudioBufferSourceNode` with `loop = true` clicks at the seam; use two overlapping sources with a short equal-power crossfade.
- **Thunder scheduling.** Today it fires every 15–45 s regardless of the rain level, and `thunder.mp3` is literally a copy of `rain.mp3`. Use 3–4 distinct claps, pick randomly, and gate frequency on the rain volume so thunder only rolls when it's raining.
- **Weather presets.** "Focus" and "Nature" exist; add "Thunderstorm", "Dawn Chorus", "Quiet Night", and let presets crossfade over ~2 s rather than jumping.
- **Fix the `AudioContext` lifecycle.** `AmbientAudioProvider`'s mount effect closes the context in its cleanup with an empty dep array — correct today, but the provider also never restarts sources after `close()`, so any remount permanently kills audio. Suspend/resume instead of close.
- **Persist across navigation** (already works via the layout-level provider — keep it) and **duck the ambience** during race countdowns.

### 6.4 Responsive design (desktop / tablet / phone)
The layout is phone-first with `md:`/`lg:` bolted on. Concretely:
- Fix the board sizing (§1.2) — it is the biggest responsive defect.
- **Desktop (≥1280px):** the app is capped at `lg:max-w-[1000px]` and the game area is `max-w-lg` (512px), so a 1920px screen shows a small centred column with a tiny grid. Give desktop a genuine two-column layout: grid left, word list + stats right.
- **Tablet portrait (768px):** currently uses the phone layout with the nav moved to the left rail; the board should be much larger.
- **Tablet landscape / iPad Pro:** untested breakpoint between `md:` and `lg:`.
- The Playwright suite only tests 375×667. Add 768×1024, 1024×1366 and 1920×1080 viewports.
- `body` has `pb-24 md:pb-0 md:pl-24 lg:pl-0` — at `lg` the left padding is removed but `FloatingNav` is positioned at `lg:left-[calc(50%-500px+24px)]`, tightly coupled to the 1000px max-width. Any width change breaks nav placement.

---

## 7. Phased plan

Each phase is independently shippable. Phases 1–2 are the ones that make the game feel fixed.

### Phase 1 — Make the board correct (highest value, ~1 sitting)
1. Add `gridTemplateRows` to `GridBoard` (§1.1).
2. Fix board sizing so it's width-driven and actually reaches `max-w-[450px]` (§1.2).
3. Remove `preserveAspectRatio="none"`; align the highlight overlay and the pointer hit-test to real cell geometry.
4. Derive cell font-size from cell size; enforce a 44px minimum touch target where the grid allows.
5. Add `key={seedStr}` so "New Puzzle" works (§1.4).
6. Define `hide-scrollbar`; fix or remove `font-title` (§2.9).
7. **Regression tests** at 375 / 768 / 1024 / 1920 asserting: no vertical overflow, square cells, highlight centre within 2px of the letter centre.

**Exit criteria:** hard mode on a phone shows 13 square cells per row, fully inside the card, with highlights landing exactly on the letters.

### Phase 2 — Make multiplayer work
1. Unwrap `msg.payload` in all five broadcast handlers (§1.3a).
2. Move `send`/`track` out of `setState` updaters (§1.3b).
3. Replace `playerA`/`playerB` with `me`/`opponent` keyed on user id (§1.3c).
4. Leader-only history writes; fix the duplicate-row bug.
5. Grace period before kicking a guest (§2.6).
6. Room codes: `crypto.getRandomValues`, 6 chars, unambiguous alphabet; validate room existence on join (§2.5).
7. Give race mode its own word pool with a length guard (§1.5); add `hideWinOverlay` to `GameClient` (§2.7); pass `roomDifficulty` to `PartnerGridDisplay` (§2.8).
8. Implement real Rematch via broadcast; persist guest ids for reconnect.
9. **Two-client Playwright test** covering: join → ready → start → countdown → identical seed on both → finish → result → rematch.

**Exit criteria:** two phones can complete a full race and a rematch without a reload.

### Phase 3 — Audio
1. Delete `generate_audio.js` and the five placeholder files.
2. Source and encode real CC0 loops + thunder one-shots (§6.3).
3. Crossfade looping; rain-gated thunder; weather presets.
4. Fix the `AudioContext` lifecycle; lazy-load on first interaction; add to the SW precache.
5. Reconcile `ATTRIBUTIONS.md` with the Settings → About copy.

### Phase 4 — Security & data integrity
1. Security headers in `next.config.ts` (§S1).
2. Fix "Delete My Data" to actually delete server rows (§S8).
3. `GREATEST` merge for stars and best time (§2.2).
4. Single-timezone daily logic (§2.3).
5. Tighten `race_history` insert policy; add a `profiles` read policy for partner names (§S2, §S4).
6. Add `.env.example`; version the SW cache; network-first for navigations (§S9, §S10).

### Phase 5 — Performance
1. Remove/replace the turbulence filters (§P1, §P2, §P9).
2. Lazy level generation (§P4).
3. Drop the 100 ms render loop (§P5).
4. Drop unused Caveat font (§P6).
5. `loading.tsx` skeletons; move static shells to server components (§P7).
6. Image handling for avatars (§P8).
7. Measure with Lighthouse before/after; target ≥90 on mobile Performance.

### Phase 6 — Responsive & accessibility polish
1. True desktop two-column game layout (§6.4).
2. Tablet portrait + landscape passes.
3. Keyboard navigation for the grid; ARIA roles; focus-visible styles.
4. Decouple `FloatingNav` positioning from the hardcoded 1000px width.
5. Multi-viewport Playwright suite.

### Phase 7 — Gameplay features
Solo: timer, hints, haptics, resume-in-progress (§6.1).
Multiplayer: co-op mode, best-of-3, ghost cursor, free-text chat, "together" butterflies (§6.2).
Replace the mock daily calendar and the fabricated `wordsFound` stat with real data (§2.4).

### Phase 8 — Cleanup
Delete dead code and starter assets; gitignore `playwright-report/` and `test-results/`; consolidate the six root docs into `docs/`; remove stray `console.*`; fix the stale test selectors (§5).

---

## 8. Budget: staying at RM0

Everything above fits the free tiers you're already on:

| Need | Free option | Notes |
|---|---|---|
| Hosting | Vercel Hobby | Already in use. Non-commercial only — fine here. |
| Database / auth / realtime | Supabase Free | 500 MB DB, 200 concurrent realtime connections, 2 GB egress. Two players will not come close. |
| Keeping Supabase from pausing | GitHub Actions cron | Already implemented and correct. Free tier is 2,000 min/month; this uses seconds. |
| Audio assets | Pixabay Audio / Freesound (CC0) | Free, no attribution required — but keep `ATTRIBUTIONS.md` accurate anyway. |
| Icons / fonts | `next/font` (self-hosted Google Fonts), hand-rolled SVG | Already in use. |
| CI / tests | GitHub Actions + Playwright | Free. |
| Monitoring | Vercel Analytics free tier, or none | Optional. |

**Watch-outs:** Supabase Free pauses after 7 days of inactivity (the cron handles this) and has no automatic backups — consider a periodic `pg_dump` via GitHub Actions into the repo or an artifact. Vercel Hobby has a 100 GB/month bandwidth cap; fixing the audio (§2.1) cuts your largest asset by ~90%.

---

## 9. Summary table

| ID | Severity | Issue | Status |
|---|---|---|---|
| 1.1 | **P0** | Missing `gridTemplateRows` → 100px overflow, highlight off by up to 97px, wrong-cell hit-testing | PROVEN |
| 1.2 | **P0** | Board collapses to 106px on phone / 182px on tablet (should be ~343 / 450) | PROVEN |
| 1.3 | **P0** | Multiplayer state stops syncing after join; Start Race permanently disabled | PROVEN |
| 1.4 | **P0** | "New Puzzle" does nothing (grid never regenerates) | CODE |
| 1.5 | **P0** | Race easy mode drops `BUTTERFLY` in 100% of puzzles (9 letters, 8×8 grid) | PROVEN |
| 1.6 | **P0** | PWA icons 404 — not installable | PROVEN |
| 2.1 | P1 | "Lofi/rain/birds/thunder" are sine waves and white noise; WAV mislabelled as MP3; thunder ≡ rain | PROVEN |
| 2.2 | P1 | Signed-in users lose best stars on replay | CODE |
| 2.3 | P1 | Daily challenge mixes local and UTC dates | CODE |
| 2.4 | P1 | Mock 7-day calendar; fabricated "words found" stat | CODE |
| 2.5 | P1 | Room codes can be <4 chars; no room-existence check | CODE |
| 2.6 | P1 | Guest kicked instantly if they arrive before the leader | CODE |
| 2.7 | P1 | Solo win overlay covers the race screen | CODE |
| 2.8 | P1 | Partner grid rebuilt with the wrong difficulty | CODE |
| 2.9 | P1 | `hide-scrollbar` and `font-title` undefined; Caveat font loaded unused | PROVEN |
| S1–S10 | P2 | Security: no headers, forgeable results, broken data deletion, guessable codes | Mixed |
| P1–P9 | P2 | Performance: turbulence filters, WAV audio, 360 levels at import, 10 Hz re-render | Mixed |
| 5.x | P3 | Dead code, committed test artifacts, stale test selectors, no keyboard access | PROVEN |
