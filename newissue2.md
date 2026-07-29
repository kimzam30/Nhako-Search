# NhakoSearch — Post-Remediation Audit (newissue2)

**Date:** 2026-07-29
**Scope:** the merged result of phases 1–8, now on `main` at commit `cfd441d`
**Supersedes:** the original audit, removed from the tree once every item in it was
closed. Recover it with `git show HEAD~1:newissue.md` if you want the history.

> **Read this first.** I could not run `npm run build`, `npm start`, `npm run lint`
> or `npx playwright test`. There is no Node runtime in my environment — `node`,
> `npm`, `npx`, `pnpm`, `yarn`, `bun` and `deno` are all absent, and no binary
> exists anywhere on the filesystem. Everything below is either measured in a
> browser, verified by static analysis, or reasoned from source. **The build is
> still unverified.** §7 lists exactly what to run and what to look for.

---

## 1. What happened in this pass

| Step | Result |
|---|---|
| Synced phases 1–8 into the main folder | Fast-forward merge, `459a766 → cfd441d`, 77 files |
| Checked main folder for work I might destroy | 60 files showed as modified; **all 60 were line-ending-only**, 0 real content changes |
| Static build check (syntax, JSX, component props) | Clean |
| Import/export consistency | Clean — 0 errors, 0 stale references |
| Dead code / unused imports | Clean |
| Secret scan across all tracked files | Clean — no keys, no `.env` ever committed |
| Bugs found and fixed this pass | 5 (§2) |

### The main folder was never modified

Before merging I compared every "changed" file byte-for-byte against its
committed version, ignoring `\r`. All 60 differences were CRLF-vs-LF from the
SMB share — **zero real content changes**. Nothing of yours was overwritten.
That CRLF churn is now fixed permanently by a new `.gitattributes` (§5).

---

## 1c. Live two-device session — findings

Tested against the deployed build with a real second client. Confirmed the build
is live (6-character codes, Phase 1–6 CSS, new icons).

### The lobby stops syncing after the first snapshot — REPRODUCED

The reported symptom ("the room creator has to refresh before Start works") is
real, and the Phase 2 fix did not fully close it.

What I established, using a raw WebSocket observer joined to the same room:

| Check | Result |
|---|---|
| Guest sends on ready-up | Yes — `state_update` broadcast **and** `presence_diff`, both carrying `isReady: true` |
| Leader applies it | No — still "NOT READY" after 6+ seconds |
| Leader's own UI on a difficulty click | Updates locally |
| Leader's frames on that click | None sent |
| Leader alone in a fresh room | Sends normally at 0s and 13s |
| Guest sees leader's later difficulty change | No — frozen at the value from when it joined |

So both clients apply their **initial** presence snapshot and nothing after it.
Frames are provably on the wire; the loss is on the deliver/apply side, and it is
timing-dependent — a solo leader works fine.

I could not pin the exact trigger from outside a production build, so rather than
guess at a root cause I made the lobby stop depending on every event arriving:

- **Presence is reconciled on a 1s interval** while the lobby or countdown is
  open. Presence is authoritative and read locally, so a missed event
  self-corrects within a second instead of needing a reload.
- `applyOpponent` ignores identical payloads, so the loop costs nothing when
  everything is already in sync.
- The channel effect no longer lists `isLeader`/`pushChat` as dependencies (both
  are stable for the room's life) and no longer nulls a shared ref a newer effect
  may already own — two ways it could tear down a live channel.

**This needs verifying on two devices after deploy.** It is a convergence fix,
not a proven root-cause fix.

### Desktop had no opponent progress bar

The opponent's bar was `lg:hidden`, on the assumption desktop showed the
partner's whole board instead. The result: the desktop player — the one who
joined — had no sense of the race at all, while the phone showed both bars. Both
bars now render at every width with a `value/total` readout, and the status bar
spans the full column instead of sitting in a narrow floating box.

### The two players were on different boards

Your screenshots show desktop on 8×8 / 6 words and phone on 10×10 / 8 words in
the same room. Same root cause: the joiner never received the leader's
difficulty, so it built a grid from its own default. The reconciliation above
should fix it — worth re-checking explicitly.

---

## 1d. UI changes from your feedback

| Area | Change |
|---|---|
| Desktop nav | The rail no longer collapses on desktop. Collapsing to one button exists to stop the nav covering the board on a phone; on a wide screen it just left a stray button in empty space. Done in CSS so SSR output still matches. |
| Phone in-game nav | The expanded pill now stacks **above** the toggle instead of beside it. Six controls in a row overflowed a 375px screen. |
| Level path on phone | Node winding was a fixed ±60px, which reads as a trail on desktop but as scattered nodes on a phone, where it is a third of the viewport. Now scaled by `--level-wind` (0.45 phone → 1 desktop). |
| Level sheet on phone | Bottom padding respects `env(safe-area-inset-bottom)` so "Play Level" clears the gesture bar. |
| Guest sign-in | Submits on Enter (the on-screen keyboard covered the button), validates a 2-character minimum, shows a live character count, adds a Back link, and states plainly that guest progress is device-only. |

Not changed, as you asked: game logic, the grid, and swipe-to-select.

---

## 2. Bugs found and fixed in the previous pass

### 2.1 PWA icons were still 404 — my miss

`newissue.md` §1.6 flagged this as **P0**, and I never assigned it to a phase.
It stayed broken through all eight phases. The manifest referenced
`/icons/icon-192.png` and `/icons/icon-512.png`; `public/icons/` did not exist.

Fixed: generated real PNGs from the app's own `ButterflySvg` path — 192, 512, a
512 maskable variant with a proper safe zone, and a 180 `apple-touch-icon`.
The manifest now declares `purpose: any` and `purpose: maskable`, and
`app/layout.tsx` exports a `viewport` with per-scheme `themeColor`.

### 2.2 CSP silently blocked some Google avatars

`img-src` allowed only `https://lh3.googleusercontent.com`. Google serves
profile pictures from `lh3` through `lh6` and other `googleusercontent`
subdomains, so a signed-in user could get a blank avatar with a console
violation and no other symptom. Widened to `https://*.googleusercontent.com`.

### 2.3 Guest progress merged twice on the home page

`mergeGuestProgress()` ran in both `<MergeClient />` (mounted in the layout, so
on every route) and again in `app/page.tsx`. Both read the `nhako_merged` flag
before either wrote it, so a first visit after sign-in could upsert the same
rows twice. Removed the page-level call.

### 2.4 Six `as any` casts survived the Phase 8 sweep

Phase 8 removed `: any` annotations but my regex never matched `as any`. The
mixer arrays in `FloatingNav` and `Settings` were indexing `volumes` through
`as any`, which would have hidden a genuine bug if a channel id were ever
misspelled. Typed as `keyof AudioVolumes`.

### 2.5 `loadLevelProgress` had no return type

It returned Supabase's untyped `data`, so every caller inferred `any[]` — which
is how the level-path page ended up with `useState<any[]>` in the first place.
Now returns `Promise<LevelProgressRow[]>`.

---

## 3. Open issues

Nothing here is a crash. Ordered by what I would fix first.

### P1 — worth doing before you share the link

| # | Issue | Detail |
|---|---|---|
| 3.1 | **iOS install is still second-class** | `apple-touch-icon.png` now exists, but iOS ignores `manifest.json` for install prompts and there is no splash-screen set. Add `apple-mobile-web-app-*` meta and startup images if you want a real iOS home-screen app. |
| 3.2 | **Race results remain self-reported** | RLS now restricts inserts to the leader and constrains `winner` to a participant, but the leader's client still decides who won. Unforgeable results need a server-side authority (an Edge Function), which is outside the RM0 free-tier comfort zone. Acceptable for two trusted players — but know it. |
| 3.3 |   **No error boundary** | A render error anywhere shows Next's default error screen. A themed `app/error.tsx` and `app/global-error.tsx` would keep the app feeling finished. |
| 3.4 | **No `not-found.tsx`** | `/level-path/does-not-exist` renders a bare "Level not found" div outside the design system. |
| 3.5 | **Level unlock is brittle** | `getStars(previous) > 0` gates progression. Completion always awards at least 1 star today, so it works — but any future path that records a 0-star completion would wall the player permanently. Gate on existence, not star count. |

### P2 — polish

| # | Issue | Detail |
|---|---|---|
| 3.6 | **Emoji in UI chrome** | `docs/design.md` says custom vectors only, no emoji. `Settings` still uses `▼`, `▶` and `⏸` as glyphs, and the chat presets ship `😤` and `🦋`. The chat ones are arguably intentional banter; the settings ones are chrome and should be SVG. |
| 3.7 | **Chat is preset-only** | Six canned phrases. Free text was scoped in Phase 7 and not built. |
| 3.8 | **Round counter is unused** | `raceState.round` increments on rematch but nothing displays it. Best-of-3 was scoped and not built. |
| 3.9 | **No ghost cursor** | Seeing where your partner is dragging was scoped in Phase 7 and not built. |
| 3.10 | **`supabase_schema.sql` sits at the root** | While migrations live in `supabase/migrations/`. Two places to look for schema truth. Fold the base schema in as `001_initial.sql`. |
| 3.11 | **Word lists ship whole to the client** | ~27 KB of JSON across six themes, all imported eagerly by the free-play route. Fine today; worth code-splitting per theme if the pools grow. |

### P3 — known and accepted

| # | Issue | Detail |
|---|---|---|
| 3.12 | 8 of 12 pages are client components | Almost nothing is server-rendered, so first paint waits on JS. The `loading.tsx` skeletons added in Phase 5 mask this. A real fix means splitting static shells from interactive islands. |
| 3.13 | Guests cannot record race history | By design — no auth row to attribute it to. The Wins stat silently stays 0 for guests. |
| 3.14 | Client-side room-creation rate limit | The 10-second cooldown is in `localStorage` and trivially bypassed. Harmless at this scale. |
| 3.15 | Supabase Free has no automatic backups | Consider a periodic `pg_dump` via GitHub Actions. |

---

## 4. Performance

Measured in a real browser during the phases, not estimated:

| Change | Before | After |
|---|---|---|
| Highlight raster (10-word board, 400px) | 9.9 ms | 2.9 ms (**3.4×**) |
| Highlight raster (900px) | 24.7 ms | 9.1 ms (**2.7×**) |
| Level data at module load | 10.8 ms | 0.1 ms (**108×**) |
| Audio payload | 1.2 MB of WAV mislabelled as MP3 | 0 bytes (synthesised) |
| Grid overflow past its card (phone, hard) | +100.5 px | 0 |
| Highlight drift from letters (phone, hard) | 96.7 px | 0 |
| Cell size (phone, easy) | 13.3 px | 40.4 px |

Remaining performance work is in §3.12 (server components) and §3.11 (word-list
splitting). Neither is urgent at two players.

---

## 5. Security posture before pushing

**Verified clean:**

- No secrets in any tracked file — scanned for JWTs, `service_role`, private
  keys, AWS keys, GitHub tokens
- No `.env` file has ever been committed, in any commit, on any branch
- `.env.local` is ignored; `.env.example` is committed as a template
- The Supabase anon key is public by design and protected by RLS, not secrecy

**Hardened this pass — `.gitignore`:**

Added coverage for `*.pem`, `*.key`, `*.p8`, `*.pkcs12`, `*.jks`,
`credentials.json`, `service-account*.json`, `.envrc`, `.direnv/`,
`supabase/.temp/`, editor directories, `.DS_Store`, `Thumbs.db`, and `.claude/`
(so the agent worktree never lands in the repo). Verified each rule matches.

**New — `.gitattributes`:**

`* text=auto eol=lf` plus binary declarations. This is what caused all 60 files
to look modified on every checkout from the SMB share; without it you would see
that noise on every push.

**Still open:** §3.2 (results are client-reported) and the CSP, which cannot be
validated without a production server — see §7.

---

## 6. Housekeeping done

- Removed 5 stale process docs: `round5-prompt.md`, `progress.md`,
  `REBUILD_CHECKLIST.md`, `plan.md`, `agents.md`. These were AI-round prompts
  and checklists that read poorly on a public repo. All recoverable from git.
- `docs/` now holds only `design.md` and `ROUTING_MAP.md`.
- `README.md` rewritten: quick start, script table, project layout, and a
  "how it works" section documenting the non-obvious invariants (grid rows,
  width-driven sizing, Supabase payload shape, `me`/`opponent` identity).
- `newissue.md` remains as the historical audit.

---

## 7. What you must run

I could not execute any of this. In order:

```bash
npm install
npm run lint
npm run build
```

**Where I expect trouble, most likely first:**

1. **Type errors in the co-op path.** `RoomMode` threads through `PlayerState`,
   the `countdown_start` payload, `useRaceRoom`'s return, and `GameClient`'s
   `partnerFoundWords`. My checker validates imports and props, not types.
2. **`GridBoard` prop spread.** It takes
   `ReturnType<typeof useGameLogic> & { readOnly?: boolean }`. Both call sites
   spread `{...game}`, so a mismatch surfaces here first.
3. **`exhaustive-deps` warnings** in `useRaceRoom` — deliberate. Refs are used
   precisely so the realtime channel is not rebuilt mid-race. Do not "fix" these
   by adding the refs to dependency arrays.

Then:

```bash
npm start                    # NOT `next dev` — headers differ
npx playwright test
```

**Check the browser console on `/`, `/settings`, `/level-path` and
`/play/race/lobby` for CSP violations.** The policy is the single change I have
the least confidence in; a wrong directive breaks the page silently.
`tests/security.spec.ts` automates this check.

**Apply the migration** in the Supabase SQL editor before testing account
deletion:

```
supabase/migrations/002_security.sql
```

Without it, "Delete My Data" will report `profiles` as failed.

---

## 8. Two behaviour changes to expect

Neither is a bug; both are consequences of correctness fixes.

1. **Existing puzzles changed.** Word selection moved to Fisher-Yates because
   `sort(() => random() - 0.5)` is an inconsistent comparator whose output
   depends on the JS engine — the same seed produced different boards in Chrome
   and Safari, which desynced races. Level and daily content therefore differs
   from before. Progress is keyed by level id, so saved stars are unaffected.

2. **The daily challenge rolls over at UTC+8.** Previously the seed used local
   date parts while the streak compared against UTC midnight, so between
   midnight and 08:00 local the app thought you had already played today's
   puzzle — the daily was unavailable for eight hours a day. One constant,
   `GAME_DAY_UTC_OFFSET_MINUTES` in `lib/daily/logic.ts`, moves the rollover.
