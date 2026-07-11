# NhakoSearch — The Meadow Journal

NhakoSearch is a shared nature journal and word search game built for mobile and tablet devices. It offers standard solo puzzles, a progression level path, a daily challenge, and a realtime race mode where two players can compete.

This repository is a Next.js (App Router) progressive web app (PWA) backed by Supabase for database, authentication, and realtime multiplayer syncing.

---

## 1. Architecture Overview
- **Framework**: Next.js 14+ (App Router), React, TypeScript.
- **Styling**: Tailwind CSS, utilizing a custom CSS-variable design system in `globals.css` to allow true dynamic theming (Light/Dark mode) that bypasses system preferences.
- **Animation**: Framer Motion for shared spring physics, page transitions, and interactive component feedback (like sticker-shadow presses).
- **Backend & Auth**: Supabase (PostgreSQL, Supabase Auth via Google OAuth, Supabase Realtime).
- **Audio**: Native Web Audio API integrated into a persistent global React Context.
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
  - Fetches and displays dynamic stats (Levels, Wins, Streak). Reads from `localStorage` for Guests, and `Supabase` for authenticated users.
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
  - Tapping an unlocked node pops open a Framer Motion bottom sheet with Star requirements.

### `/level-path/[levelId]` (Level Gameplay)
- **Purpose**: Executes the puzzle for a specific node on the level path.
- **Features**: Uses the `<GameClient />` with a hardcoded seed attached to the `levelId` so the level is identical every time. Handles saving progress (0-3 stars based on completion time).

### `/play/standard/[...slug]` (Standard Play)
- **Purpose**: Unlimited, casual free play.
- **Features**: 
  - Reads `theme` and `difficulty` parameters from the URL.
  - Filters out recent words using `sessionStorage` (e.g., `nhako_recent_garden_easy`) to prevent immediate puzzle repeats.
  - Passes a fully random `Math.random()` seed to `<GameClient />` so grids are always unique.

### `/play/race/lobby` (Race Lobby)
- **Purpose**: Segmented control screen to Join or Create a multiplayer room.
- **Features**: Generates a random 4-character Room Code (`Math.random().toString(36)`) or validates a 4-character input before routing the user to the specific room URL.

### `/play/race/[roomCode]` (Race Room)
- **Purpose**: Realtime 2-player racing environment with a lobby, countdown, and active play states.
- **Features**: 
  - **Lobby Phase**: Both users configure their personal difficulty. Both must hit "Ready" to initiate a synced 3-second countdown.
  - **Live Gameplay**: Shared countdown timer. Realtime progress bars. Mini floating tray for one-tap "Banter" chat.
  - **Results Phase**: Shows the winner, both garlands side-by-side, and offers a Rematch.
- **Connections**: Fully relies on `useRaceRoom` custom hook interfacing with Supabase Realtime Channels (`room:{code}`).

### `/profile` (Profile & Collection)
- **Purpose**: Visual sticker album for earned butterflies and aggregate user stats.
- **Features**: 
  - Pulls `butterfly_collection` records to populate a 30-slot grid.
  - Interacting with an earned butterfly opens a detailed modal showing where and when it was unlocked.

### `/settings` (Settings)
- **Purpose**: App configuration.
- **Features**:
  - Appearance toggles (Light/Dark/System) that directly manipulate the `document.documentElement` class list and `localStorage`.
  - Advanced Sound Mixer binding sliders to `useAmbientAudio` volumes.
  - Account actions: Sign out, and Data Deletion warnings.

---

## 4. Key Features & Systems

### The Puzzle Generator (`lib/puzzle/generator.ts`)
- **Deterministic**: Powered by a Mulberry32 PRNG and a `cyrb128` string hash. A specific seed + word list + difficulty will ALWAYS yield the exact same grid layout.
- **Difficulty Scaling**: Easy (8x8, H/V), Medium (10x10, +Diag), Hard (13x13, +Reverse).

### Game Client (`components/game/GridBoard.tsx` & `useGameLogic.ts`)
- The grid board uses an SVG canvas set to `viewBox="0 0 100 100"` to render touch-friendly highlight paths.
- Line widths and coordinates are absolute within the SVG space to prevent mobile rendering glitches.
- Uses `PointerEvents` (`onPointerDown`, `onPointerEnter`, `onPointerUp`) to support seamless dragging across cells.

### Multiplayer Sync (`lib/multiplayer/useRaceRoom.ts`)
- Utilizes `supabase.channel()` to broadcast and listen to ephemeral JSON packets.
- Implements deterministic Host-Election: When an event requires authoritative consensus (like starting a race), the client sorts both Player IDs alphabetically. The first ID triggers the state transition, preventing race conditions or duplicated network requests.

### Global Sound Engine (`components/sound/AmbientAudioProvider.tsx`)
- Native Web Audio API implementation holding an `AudioContext`.
- Manages 5 separate `GainNodes` (Master, Lofi, Rain, Wind, Birds).
- State synced to `localStorage` (per-device preference) and provided globally to allow the `FloatingNav` and `Settings` pages to modify volume sliders simultaneously.

### Theming System
- Relies on CSS variables (e.g. `--bg`, `--ink`, `--accent`).
- The `layout.tsx` file injects a blocking `<script>` in the `<head>` that reads `nhako_theme` from `localStorage` to instantly attach `.dark` to the HTML root, avoiding React hydration flashes (FOUC) completely.

---

## 5. Components Deep Dive

### Global Chrome
- **`FloatingNav.tsx`**: A responsive, bottom-anchored (or side-anchored on tablet) navigation pill. Features Framer Motion layout animations, a mini Sound Mixer popover, and dynamically minimized states during active gameplay to prevent accidental navigation.
- **`SignatureFooter.tsx`**: A small, tilted `-2deg` hand-written text element at the bottom of scrollable pages ensuring the app feels personal and hand-crafted.

### Game UI
- **`ButterflyGarland.tsx`**: The core progression UI. Renders earned butterflies linearly. Animates new butterflies popping into existence upon finding words.
- **`GridBoard.tsx`**: Renders the letter matrix and the dynamic pink SVG highlight overlay.
- **`WordList.tsx`**: A pill-based list of words to find. Pills cross out and dim gracefully once found.
- **`LetterCell.tsx`**: A simple memoized div rendering individual characters, dispatching pointer events to the Game logic context.

---

## 6. Design System Principles (The Meadow Journal)
As outlined in the design spec, the repo rigidly adheres to specific anti-generic UI rules:
1. **Asymmetric Border Radii**: Components use `border-radius: 22px 9px 26px 13px` syntax to avoid looking like template boxes.
2. **Sticker Shadows**: No CSS blurring. Box shadows use strict solid offsets `shadow-[4px_5px_0_0_var(--ink)]`.
3. **Paper Grain Textures**: Global turbulence SVG noise filters sit behind the app.
4. **Custom Vectors Only**: No emojis. Standard icons are hand-wobbled SVGs (e.g., `FlameSvg`, `StarSvg`, `ButterflySvg`).
