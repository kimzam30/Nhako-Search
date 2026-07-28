# NhakoSearch

A cozy, hand-drawn word-search game for two. Solo puzzles, a daily challenge, a
360-level path, and realtime multiplayer — race your partner, or solve one board
together.

Live at **[search.nhako.com](https://search.nhako.com)**

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript | |
| Styling | Tailwind CSS v4 | CSS-variable theming, light/dark independent of system |
| Animation | Framer Motion | |
| Backend | Supabase | Postgres, Google OAuth, Realtime channels |
| Audio | Web Audio API | Fully synthesised at runtime — no audio files shipped |
| Testing | Playwright | 8 suites: layout, a11y, race, audio, security, performance |
| Hosting | Vercel | |

Everything runs on free tiers.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project values
npm run dev
```

Then apply the database schema in the Supabase SQL editor:

1. `supabase_schema.sql` — tables and row-level security for a fresh project
2. `supabase/migrations/002_security.sql` — required for existing projects

Without step 2, "Delete My Data" cannot remove the profile row.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npx playwright test` | Full test suite |

Security headers come from `next.config.ts` and behave differently under
`next dev`. Verify CSP against `npm run build && npm start`.

---

## Project layout

```
app/                     Routes (App Router)
  daily/                 Daily challenge + streak
  level-path/            Level map and per-level gameplay
  play/standard/         Free play (theme + difficulty)
  play/race/             Multiplayer lobby and room
  profile/  settings/    Collection, stats, mixer, account
components/
  game/                  Board, cells, word list, garland
  multiplayer/  nav/  sound/  ui/
lib/
  audio/                 Procedural ambience + sound effects
  puzzle/                Grid generator and game logic
  multiplayer/           Realtime room, identity, match history
  levels/  daily/  auth/
docs/                    Design spec and routing map
supabase/migrations/     SQL migrations
tests/                   Playwright suites
```

---

## How it works

### Puzzle generation — `lib/puzzle/generator.ts`

Deterministic: a Mulberry32 PRNG seeded from a `cyrb128` hash of the seed
string. The same seed, word list and difficulty always produce the same grid,
**in every browser** — word selection uses Fisher-Yates rather than
`sort(() => random() - 0.5)`, whose result depends on the engine's sort
algorithm and could hand two players different boards.

Words longer than the grid are filtered out before placement, and any word that
fails to place is backfilled from spares, so a puzzle always offers its full
count.

Difficulty: easy 8×8 / 6 words, medium 10×10 / 8, hard 13×13 / 10.

### The board — `components/game/GridBoard.tsx`

Two rules that are easy to break and expensive to get wrong:

- **`gridTemplateRows` must be declared alongside `gridTemplateColumns`.**
  Without it rows size to text, the grid overflows its card, and the highlight
  overlay drifts away from the letters.
- **The board sizes from its width**, via `.grid-board`
  (`min(100%, 450px, 100dvh - 330px)`). Deriving width from leftover flex
  height collapses it.

The hand-drawn wobble is baked into path geometry rather than produced by an
SVG turbulence filter, which cost roughly 3× more to rasterise per frame.

Full keyboard play: the grid is a composite widget with one tab stop, arrow-key
cursor, Enter to anchor and complete a word, Escape to cancel.

### Multiplayer — `lib/multiplayer/useRaceRoom.ts`

Ephemeral Supabase Realtime channels (`room:{code}`); there is no room table.

- **Payload shape.** Supabase delivers `{ type, event, payload }` to broadcast
  listeners. Read `msg.payload.x`, never `msg.x`.
- **Identity.** State is keyed `me` / `opponent` by user id, never positionally.
- **Leader authority.** The room creator sets mode and difficulty and fires
  `countdown_start`, `game_over`, `rematch` and `room_closed`. Only the leader
  resolves a timeout and writes match history.
- **Modes.** `race` (separate boards, first to finish) and `coop` (one shared
  board, finds pooled, both players earn a "together" butterfly).

### Audio — `lib/audio/`

Ambience is generated live: pink-noise rain and wind, FM bird chirps,
filtered-noise thunder gated on the rain level, and a generative lofi chord
progression. Sound effects are synthesised the same way. Nothing is downloaded.

The `AudioContext` is suspended and resumed, never closed — a closed context
cannot be reopened.

To use a real lofi recording instead, see `public/audio/README.md`.

### Theming

CSS variables in `app/globals.css`. A blocking script in `app/layout.tsx` reads
the saved theme before first paint to avoid a flash of the wrong palette.

---

## Design principles

From `docs/design.md` — "The Meadow Journal":

1. Asymmetric border radii (`22px 9px 26px 13px`), never uniform boxes
2. Solid offset "sticker" shadows, no blur
3. Paper-grain texture behind the app
4. Hand-drawn SVG icons only, no emoji in UI chrome

---

## Notes for contributors

- Run `npx playwright test` before pushing. The suites encode fixes that are
  easy to regress — particularly grid geometry and realtime payload handling.
- `newissue2.md` tracks the current known-issues backlog.
