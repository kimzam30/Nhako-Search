# NhakoSearch — The Meadow Journal

NhakoSearch is a shared nature journal and word search game built for mobile and tablet devices. It offers standard solo puzzles, a progression level path, a daily challenge, and a realtime race mode where two players can compete.

This repository is a Next.js (App Router) progressive web app (PWA) backed by Supabase for database, authentication, and realtime multiplayer syncing.

> **Project docs** live in `docs/` (design spec, routing map, historical plans).
> `newissue.md` holds the full audit and the phased remediation plan.

---

## 1. Architecture Overview
- **Framework**: Next.js 14+ (App Router), React, TypeScript.
- **Styling**: Tailwind CSS, utilizing a custom CSS-variable design system in `globals.css` to allow true dynamic theming (Light/Dark mode) that bypasses system preferences.
- **Animation**: Framer Motion for shared spring physics, page transitions, and interactive component feedback (like sticker-shadow presses).
- **Backend & Auth**: Supabase (PostgreSQL, Supabase Auth via Google OAuth, Supabase Realtime).
- **Audio**: Fully procedural — ambience and sound effects are synthesised at runtime with the Web Audio API, so no audio files are shipped.
- **Testing**: Playwright for UI regression and viewport testing.
- **Hosting**: Vercel (Hobby plan).

---

## 2. Directory Structure & Routing Map
The app follows a flat, accessible Next.js App Router structure. There are no dead ends or fake anchor links; everything is a real route.

```
/app
 ├── page.tsx                     (Home / Dashboard)
 ├── layout.tsx                   (Global layout + Theme/PWA Injector)
 ├── globals.css                  (Tailwind directives, Theme tokens)
 ├── sign-in/                     (Google OAuth & Guest Entry)
 ├── daily/                       (Daily Challenge + Streak Tracker)
 ├── level-path/
 │    ├── page.tsx                (Scrollable Winding Map)
 │    └── [levelId]/page.tsx      (Level gameplay)
 ├── play/
 │    ├── standard/[...slug]/     (Solo free play setup & game)
 │    └── race/
 │         ├── lobby/             (Create/Join room)
 │         └── [roomCode]/        (Race ready-up, live game, results)
 ├── profile/                     (Stats & Butterfly Sticker Collection)
 └── settings/                    (Appearance, Sound Mixer, Account Management)
```

---

## 3. Detailed Page Breakdown

### `/` (Home)
- **Purpose**: The central dashboard and landing page. Guest by default, no forced login gates.
- **Features**: 
  - Splash screen (first load only, managed via `sessionStorage`).
  - Fetches and displays dynamic stats (Levels, Wins, Streak). Reads from `localStorage` for Guests, and `Supabase` for authenticated users via unified fetching.
  - Quick-action cards to enter Daily Challenge, Level Path, Race Lobby, Standard mode, and Profile.
- **Connections**: Connects to `level_progress`, `race_history`, and `daily_challenge_log` to aggregate the top-level stats.

### `/sign-in` (Sign In)
- **Purpose**: Optional user authentication.
- **Features**: 
  - Offers a primary "Sign in with Google" button mapped to Supabase OAuth.
  - Offers a fallback "Continue as guest" button that flags `localStorage`.
- **Design**: Minimalist interface focusing on a dual-butterfly SVG animation loop. No navigation chrome.

### `/daily` (Daily Challenge)
- **Purpose**: A shared, daily-seeded puzzle that tracks user streaks.
- **Features**: 
  - Displays a calendar strip of the last 7 days of streak history.
  - Validates completion state. If completed today, locks gameplay and shows "Come back tomorrow" overlay.
  - Wraps the core `<GameClient />` passing a deterministic seed (e.g. `2026-07-12`).
- **Connections**: Reads/writes to the `daily_challenge_log` table (or local storage equivalents).

### `/level-path` (Level Map)
- **Purpose**: A Candy-Crush-style vertical scrolling map grouping puzzles into thematic chapters.
- **Features**: 
  - Winding path of nodes (`[levelId]`).
  - Calculates the highest unlocked level by reading `level_progress`.
  - Animated pulsing marker for the current unlocked level.
  - Locked levels are visually inaccessible standard `<div>` or `<button disabled>` nodes.
  - Tapping an unlocked node pops open a Framer Motion bottom sheet with Star requirements (secured via precise z-index math).

### `/level-path/[levelId]` (Level Gameplay)
- **Purpose**: Executes the puzzle for a specific node on the level path.
- **Features**: Uses the `<GameClient />` with a hardcoded seed attached to the `levelId` so the level is identical every time. Handles saving progress (0-3 stars based on completion time).

### `/play/standard/[...slug]` (Standard Play)
- **Purpose**: Unlimited, casual free play.
- **Features**: 
  - Setup screen includes horizontal, wrap-prevented scroll sections with animated visual hints ("Scroll for more →").
  - Reads `theme` and `difficulty` parameters from the URL.
  - Filters out recent words using `sessionStorage` (e.g., `nhako_recent_garden_easy`) to prevent immediate puzzle repeats.
  - Passes a fully random `Math.random()` seed to `<GameClient />` so grids are always unique.

### `/play/race/lobby` (Race Lobby)
- **Purpose**: Segmented control screen to Join or Create a multiplayer room.
- **Features**: Generates a random 4-character Room Code (`Math.random().toString(36)`) or validates a 4-character input before routing the user to the specific room URL. The creator of the room is granted `isLeader` status.

### `/play/race/[roomCode]` (Race Room)
- **Purpose**: Realtime 2-player racing environment with a lobby, countdown, and active play states.
- **Features**: 
  - **Lobby Phase**: Leader Authority system. The Leader dictates the difficulty and manually triggers the "Start" sequence. Guests receive a read-only "Waiting for Leader..." state.
  - **Live Gameplay**: Globally synced 3-2-1 countdown into shared play. Realtime progress bars reflect exact word-find events.
  - **Auto-Kick Teardown**: If the Leader leaves the room or disconnects, presence hooks immediately route the Guest back to the lobby.
  - **Banter Chat**: Mini floating tray for one-tap text communication, rendering both sender tags and unclipped message blocks.
  - **Results Phase**: Shows the winner, both garlands side-by-side, and offers a Rematch.
- **Connections**: Fully relies on `useRaceRoom` custom hook interfacing with Supabase Realtime Channels (`room:{code}`).

### `/profile` (Profile & Collection)
- **Purpose**: Visual sticker album for earned butterflies and aggregate user stats.
- **Features**: 
  - Dynamically fetches comprehensive user stats natively via `level_progress` and `daily_challenge_log` to render responsive loading skeletons before dropping in true data.
  - Pulls `butterfly_collection` records to populate a 30-slot grid.
  - Interacting with an earned butterfly opens a detailed modal showing where and when it was unlocked.

### `/settings` (Settings)
- **Purpose**: App configuration.
- **Features**:
  - Appearance toggles (Light/Dark/System) managed via a smoothly animated horizontal layout, manipulating `localStorage`.
  - Advanced Sound Mixer binding sliders to `useAmbientAudio` volumes.
  - Account actions: Sign out, and Data Deletion warnings.

---

## 4. Key Features & Systems

### The Puzzle Generator (`lib/puzzle/generator.ts`)
- **Deterministic**: Powered by a Mulberry32 PRNG and a `cyrb128` string hash. A specific seed + word list + difficulty always yields the same grid — in every browser. Word selection uses Fisher-Yates; the previous `sort(() => random() - 0.5)` was an inconsistent comparator whose result depended on the engine's sort algorithm, so two players could get different grids from the same seed.
- **Length-guarded**: Words longer than the grid are filtered out before placement, and unplaceable words are backfilled from spares, so a puzzle always offers its full word count.
- **Difficulty Scaling**: Easy (8x8, H/V), Medium (10x10, +Diag), Hard (13x13, +Reverse).

### Game Client (`components/game/GridBoard.tsx` & `useGameLogic.ts`)
- Strict coordinate math explicitly validates orthogonal (dx=0 or dy=0) and perfect diagonal vectors to ensure flawless 360-degree dragging.
- The board is sized from its WIDTH via the `.grid-board` class (`min(100%, 450px, 100dvh - 330px)`). It must never derive width from leftover flex height — doing so collapsed the board to ~106px on a phone.
- `gridTemplateRows` is declared alongside `gridTemplateColumns`. Without it, rows size to text and the grid overflows its card while the highlight overlay drifts away from the letters.
- Uses `PointerEvents` (`onPointerDown`, `onPointerEnter`, `onPointerUp`) to support seamless dragging across cells.

### Multiplayer Sync (`lib/multiplayer/useRaceRoom.ts`)
- Utilizes `supabase.channel()` to broadcast and listen to ephemeral JSON packets.
- **Leader Authority State Machine**: The room creator dictates difficulty and mode, and fires authoritative broadcast events (`countdown_start`, `game_over`, `rematch`, `room_closed`).
- **Payload shape**: Supabase delivers `{ type, event, payload }` to broadcast listeners. Always read `msg.payload.x`, never `msg.x`.
- **Identity**: state is keyed `me` / `opponent` by user id — never positional, or both clients believe they are the same player.
- **Modes**: `race` (separate boards, first to finish) and `coop` (one shared board, finds pooled).

### Global Sound Engine (`components/sound/AmbientAudioProvider.tsx`)
- Everything is generated in-browser (`lib/audio/engine.ts`): pink-noise rain and wind, FM bird chirps, filtered-noise thunder, and a generative lofi chord progression. No audio files are downloaded.
- Channels: Master, Lofi, Rain, Thunder, Wind, Birds, plus SFX for game feedback.
- The `AudioContext` is suspended/resumed, never closed — a closed context cannot be reopened.
- State synced to `localStorage` (per-device preference) and provided globally to allow the `FloatingNav` and `Settings` pages to modify volume sliders simultaneously.

### Theming System
- Relies on CSS variables (e.g. `--bg`, `--ink`, `--accent`).
- The `layout.tsx` file injects a blocking `<script>` in the `<head>` that reads `nhako_theme` from `localStorage` to instantly attach `.dark` to the HTML root, avoiding React hydration flashes (FOUC) completely.

---

## 5. Components Deep Dive

### Global Chrome
- **`FloatingNav.tsx`**: A responsive, 6-icon navigation pill that anchors to the bottom-center on mobile, and the left-center on tablet/desktop. 
  - **Universal Pause Integration**: During active gameplay, clicking navigation links intercepts the route event and opens an in-app confirmation sheet (not `window.confirm`).
  - **Framer Motion Integration**: The entire structure smoothly shrinks to a `w-14 h-14` Hamburger pill to minimize UI blocking, toggling open and closed effortlessly.
- **`SignatureFooter.tsx`**: A small, tilted `-2deg` hand-written text element at the bottom of scrollable pages ensuring the app feels personal and hand-crafted.

### Game UI
- **`ButterflyGarland.tsx`**: The core progression UI. Renders earned butterflies linearly. Animates new butterflies popping into existence upon finding words.
- **`GridBoard.tsx`**: Renders the responsive letter matrix and the dynamic pink SVG highlight overlay directly coupled to the bounds of the fluid container.
- **`WordList.tsx`**: A responsive flex-wrapped word pill container replacing standard horizontal scrolling, keeping all required targets visibly stacked for the player at all times.
- **`LetterCell.tsx`**: A simple memoized div rendering individual characters, dispatching pointer events to the Game logic context.

---

## 6. Design System Principles (The Meadow Journal)
As outlined in the design spec, the repo rigidly adheres to specific anti-generic UI rules:
1. **Asymmetric Border Radii**: Components use `border-radius: 22px 9px 26px 13px` syntax to avoid looking like template boxes.
2. **Sticker Shadows**: No CSS blurring. Box shadows use strict solid offsets `shadow-[4px_5px_0_0_var(--ink)]`.
3. **Paper Grain Textures**: Global turbulence SVG noise filters sit behind the app.
4. **Custom Vectors Only**: No emojis. Standard icons are hand-wobbled SVGs (e.g., `FlameSvg`, `StarSvg`, `ButterflySvg`, custom Hamburger menu toggle).
