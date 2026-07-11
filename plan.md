# plan.md — NhakoSearch

*Updated: added installable PWA, a Candy-Crush-style level path with daily challenge, optional
Google accounts for cross-device progress, and in-race banter chat. See §5–§9 and §11 for what's
new; §1–§2 restate the still-true core premise.*

## 1. Vision
A free, just-for-us word search game: normal solo puzzles, a level-by-level progression path,
a daily challenge, and a realtime "race" mode where you and your partner each get a word list
sized to your own difficulty and see who clears it first. Cartoonish pink/butterfly look, light
+ dark mode, a customizable ambient sound mixer, quick-tap banter chat during races, installable
to the home screen, and progress that follows you across your phone and tablet. Hosted at
**nhako.com**. Zero cost, zero ambition to scale — every decision below is made for a two-player
hobby project, not "what would a real startup do."

## 2. Scope

**In scope**
- Standard (solo) word search: difficulty levels, themed word lists, light/dark mode.
- **Level Path**: ~5 themed chapters of curated levels with a Candy-Crush-style map and 0–3 star
  ratings — no lives, no energy timers, no purchasable skips.
- **Daily Challenge**: one shared puzzle per day, streak tracking.
- **Accounts**: optional Google Sign-In (via Supabase Auth) for progress that syncs across
  devices, plus a Guest mode with local-only progress and a later "claim" flow.
- Race mode: realtime 2-player, per-player difficulty-scaled word sets, shared countdown timer,
  live progress, **quick-tap banter chat** mid-race + freeform chat in lobby/results.
- Sound mixer: Lofi / Rain / Wind / Birds, independently volumed, mixable, saved per device.
- **Installable PWA**: home-screen icon, offline-friendly caching for the static shell, word
  lists, and sound loops.
- Mobile & tablet-first responsive design.
- Custom domain (nhako.com) with HTTPS.

**Explicitly out of scope** (revisit only if you actually want them later)
- Payments, ads, or any monetization — including anything that resembles Candy Crush's lives/
  energy/booster economy.
- Support for large numbers of concurrent players/rooms or accounts.
- A native iOS/Android app — a well-built PWA covers "phone and tablet" without an app-store
  submission.
- Persisted chat logs — banter/chat stays live-only, never written to a database (see §9).

## 3. Tech stack & why (verified July 2026)

| Piece | Choice | Free-tier reality check |
|---|---|---|
| Frontend framework | Next.js + TypeScript + Tailwind | No cost, runs anywhere |
| Animation | **Framer Motion** | Free, MIT-licensed, gives spring physics + shared-element transitions without hand-rolling them — needed now that motion is used throughout, not just once |
| Hosting | **Vercel — Hobby plan** | Free forever for personal/non-commercial projects: custom domains, free SSL, 100 GB bandwidth/month. Its terms restrict Hobby to non-commercial use — matches this project exactly |
| Realtime multiplayer | **Supabase — Free plan (Realtime Broadcast/Presence)** | ~200 concurrent connections, ~2M messages/month free — you'll use a sliver of that. Free projects auto-pause after 7 days idle (see §12) |
| Auth | **Supabase Auth — Google provider** | Included free with the same Supabase project; up to 50,000 monthly active users on the free tier (you'll use 2) — no separate service, no passwords for you to manage |
| Database | **Supabase Postgres (free tier)** | Now genuinely used — see §5 for the small set of tables needed for progress/levels/collection. 500 MB free storage is enormous for a few hundred rows total |
| Domain | nhako.com (already owned) | Point it at Vercel via DNS — no extra cost beyond what you already pay for the domain |
| Audio | Web Audio API (native browser) | No paid library needed |
| PWA | Web App Manifest + Service Worker (e.g. via `next-pwa` or Next's native manifest route) | Free; enables "Add to Home Screen" + offline caching |
| Fonts | Google Fonts (Fredoka, Nunito, Caveat) | Free, open license |

**Total recurring cost: still $0/month**, aside from the domain renewal you already budget for.

## 4. Architecture (in words)
```
 Browser (phone/tablet, installed as PWA)
     │
     ├── Next.js app (client-side game logic + service worker cache)
     │      ├── Puzzle generator (pure fn, seeded RNG)
     │      ├── Grid / selection / timer / garland / level-map UI
     │      └── Web Audio mixer (4 looping tracks)
     │
     ├── Supabase Auth (Google OAuth) — issues the session used everywhere below
     │
     ├── Supabase Postgres — level_progress, daily_challenge_log,
     │      butterfly_collection, profiles, race_history (all RLS-scoped to auth.uid())
     │
     └── Supabase Realtime channel "room:{code}"  ⇄  other player's browser
            (player_joined / word_found / timer_sync / game_over / chat_message —
             ephemeral broadcast only; chat_message is never written to a table)
```
Puzzle grids are still generated identically on both clients from a shared seed — the backend
never needs to know the puzzle itself, only small events and each player's own saved progress.

## 5. Data model & accounts
Six small tables, all with **Row Level Security scoped to `auth.uid()`** — each person can only
read/write their own rows:

| Table | Purpose |
|---|---|
| `profiles` | id (= auth user id), display_name, avatar_url, created_at |
| `level_progress` | user_id, level_id, stars (0–3), best_time_seconds, completed_at |
| `daily_challenge_log` | user_id, challenge_date, completed_at, streak_count |
| `butterfly_collection` | user_id, butterfly_style_id, earned_from, earned_at |
| `race_history` | id, player_a, player_b, winner, difficulty_a, difficulty_b, played_at *(optional — powers the "race record vs. partner" stat)* |

**Guest mode:** if not signed in, the exact same shape is mirrored into `localStorage`, so
gameplay is identical either way. Signing in later offers a one-time "claim this progress" merge
into the new account, rather than losing it.

**Setting up Google Sign-In without the hassle:** create the OAuth credentials in Google Cloud
Console, plug them into Supabase's Auth → Providers → Google settings, and **leave the OAuth
consent screen in "Testing" mode** with your two Google accounts added as test users. That skips
Google's app-verification review entirely (which is built for public-facing apps) and stays
completely free — appropriate since this is a two-person app, not a public product.

## 6. Progression system

### Level Path
- ~5 themed chapters, ~15 levels each (~75 total): Garden → Rainy Day → Cozy Cottage → Night Sky
  → Date Night. Difficulty ramps within each chapter (early levels Easy, later ones Medium/Hard).
- Grids are still generated by the same seeded procedural generator — only the word list, theme,
  and difficulty are curated per level, so there's no need to hand-place 75 grids.
- **Star rating, not pass/fail:** 3★ = fast/clean finish, 2★ = completed within a generous time
  guide, 1★ = completed at all. There is no way to "lose" a level — no lives, no energy, no
  timer that ends the attempt. Stars measure quality, not gatekeeping.
- Levels unlock sequentially (1★ on the current level unlocks the next). No side-purchases, no
  skip tokens — deliberately, to avoid recreating the parts of Candy Crush that exist to extract
  money from strangers.

### Daily Challenge
- One shared puzzle per day, generated from a deterministic date-seed so it's identical if you
  both play it.
- Simple streak counter (consecutive days completed); a missed day resets it — no "streak freeze"
  purchase mechanic.
- Completing it can award a unique "daily" butterfly variant into the Collection as a small,
  non-manipulative incentive to check in.

## 7. Difficulty design (Standard, Level, and Race modes)

| Difficulty | Grid size | Word count | Word length | Directions | Suggested timer (Race mode) |
|---|---|---|---|---|---|
| Easy | 8×8 | 6 words | 3–5 letters | Horizontal + vertical | 3:00 |
| Medium | 10×10 | 8 words | 4–7 letters | + diagonals | 2:30 |
| Hard | 13×13 | 10 words | 5–9 letters | + backwards/reversed | 2:00 |

In Race mode, each player picks their **own** difficulty — a stronger player can self-handicap
on Hard while the other plays Easy. The timer is shared; the word list is per-player.

## 8. Word lists
Static JSON under `/lib/words/`, grouped by the same theme names used for Level Path chapters
(Garden, Rainy Day, Cozy Cottage, Night Sky, Date Night) plus a free "Standard" pool for casual
play.

**Minimum pool size: 150–300 words per theme**, tagged with length so Easy/Medium/Hard can
filter appropriately. The first build shipped with roughly 5–10 words per theme total, which is
why puzzles felt predictable even before the seeding bug (see `agents.md` §5) made them outright
static — a pool that small repeats within a couple of sittings no matter how good the RNG is.

**Where to actually get that many words, without hand-typing them:**
- **For themed pools** (Level Path chapters, Daily Challenge): use the **Datamuse API**
  (`api.datamuse.com`, free, no key, no signup) as a *content-generation tool during
  development*, not a runtime dependency. A one-time script hitting
  `https://api.datamuse.com/words?ml=garden&max=300` returns ~300 words semantically related to
  "garden" that you skim and paste into the static JSON — turns hours of manual brainstorming
  into a few minutes of curation per theme. Keep it out of the shipped app (no live API call
  during gameplay) so puzzles never depend on an external service being up.
- **For Standard (free-play) mode**, which doesn't need to be thematic: bundle a large
  permissively-licensed static word list instead of curating one — e.g. the `an-array-of-
  english-words` npm package (~275,000 English words, MIT license) or a common-words subset like
  Google's 10,000-most-frequent-English-words list, filtered at build time to a reasonable length
  range (4–9 letters) and to exclude anything obscure/inappropriate. This alone solves "I keep
  seeing the same words" for free-play without touching the themed content at all.

**Anti-repeat logic:** in Standard mode, keep the last 3–5 word-sets played in memory (session
state is enough, no table needed) and exclude those words from the next random draw.

Worth adding later: a "Your Words" custom list — a text input feeding the same generator, for
inside jokes and pet names, no backend needed.

## 9. Realtime multiplayer: race sync + banter chat
- Race state (`player_joined`, `word_found`, `timer_sync`, `game_over`) is broadcast over one
  Supabase channel per room, as before.
- **Banter chat** is a new event on the same channel: `chat_message { playerId, type: 'quick' |
  'text', content, timestamp }`. `'quick'` covers the preset in-race chips (GG!, 😤, "So close!",
  "Nice find!", 🦋, "Hurry up!"); `'text'` covers freeform messages, only surfaced in the lobby
  and results screens per the UI spec in `design.md` §6.10–6.11.
- **Deliberately not persisted.** Chat is live-broadcast only — there's no `chat_messages` table.
  That keeps the data model small and avoids storing conversation history for what's meant to be
  a lightweight in-the-moment thing between two people.

## 10. Sound assets — sourcing plan
Four loopable ambient tracks: **Lofi, Rain, Wind, Birds.** Good free/no-copyright sources:
- **Pixabay Audio** — filterable by CC0 (no attribution required); good for rain/wind/bird
  ambience.
- **Freesound.org** — huge library; filter to CC0 specifically, since not every upload is CC0
  even within a general ambience search — check the license tag per sound before downloading.
- **Mixkit** — free sound-effect library with an "Ambience" category, usable under their free
  license for personal projects.

Keep `public/audio/ATTRIBUTIONS.md` noting source + license per track, even the CC0 ones.

## 11. PWA & installability
- **Manifest:** name "NhakoSearch," 192px/512px icons, `theme_color` = `--accent`,
  `background_color` = `--bg`, `display: "standalone"`.
- **iOS specifics:** apple-touch-icon + apple-mobile-web-app meta tags, since iOS's "Add to Home
  Screen" flow has its own quirks separate from Android's install prompt.
- **Service worker:** cache the app shell, word-list JSON, and the four ambient audio loops
  (stale-while-revalidate) so repeat sessions load fast and don't re-download sound files on
  spotty mobile data.
- Push notifications (e.g. a daily-challenge reminder) are a possible future add-on, not part of
  this pass — they need extra setup and behave a little differently between Android and iOS PWAs,
  worth scoping separately once the core app is solid.

## 12. Milestones
- [ ] **Phase 0 — Skeleton live:** Next.js app scaffolded, deployed to Vercel, nhako.com pointed
      at it and serving HTTPS.
- [ ] **Phase 1 — Standard mode MVP:** grid generator, drag/tap selection, found-word detection,
      win state. Playable solo end-to-end.
- [ ] **Phase 2 — Visual identity & motion:** light/dark theming, type system, butterfly garland,
      the shared Framer Motion spring config and page-transition patterns from `design.md` §5.
- [ ] **Phase 3 — Sound mixer:** 4-track Web Audio mixer, presets, persistence.
- [ ] **Phase 4 — Accounts & data:** Supabase Auth (Google) wired up, Guest mode + claim flow,
      the six tables from §5 with RLS in place.
- [ ] **Phase 5 — Level Path & Daily Challenge:** level map UI, star logic, chapter word lists,
      daily-seed puzzle + streak tracking, Butterfly Collection screen.
- [ ] **Phase 6 — Race mode + chat:** Supabase Realtime rooms, room create/join, per-player
      difficulty, synced countdown, dual garlands, quick-tap + freeform banter chat, results
      screen.
- [ ] **Phase 7 — PWA:** manifest, icons, service worker caching, install-prompt polish.
- [ ] **Phase 8 — Playtest & polish:** play it together on real phones, tune difficulty/timers/
      motion by feel.

## 13. Risks & honest caveats
- **Supabase free-project auto-pause (7 days idle):** fine for casual play; a free weekly ping
  (GitHub Actions hitting a health endpoint) keeps it awake if that's ever annoying.
- **Mobile autoplay restrictions:** ambient sound needs one explicit "start ambience" tap — a
  browser rule on every platform, not something to design around.
- **Vercel Hobby is personal-use only:** matches this project's intent exactly; revisit only if
  usage or intent ever genuinely changes.
- **Freesound licenses vary per upload** even within CC0 filters — spot-check each file's actual
  license page before bundling it.
- **Adding accounts adds a little real surface area** (auth, RLS policies, a "delete my data"
  path in Settings) compared to the original no-backend plan — still trivial at this scale, but
  worth testing RLS policies deliberately (i.e., confirm you truly can't read your partner's row
  from your own session) since it's the one place a bug could leak private data between the two
  of you.
- **iOS PWA behavior differs from Android** (install flow, and any future push notifications) —
  test the real "Add to Home Screen" experience on her actual phone before considering it done.

## 14. Budget
Still $0/month software cost. The only expense is the nhako.com domain renewal you already own.
