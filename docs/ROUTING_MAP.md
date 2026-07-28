# Routing Map

This document maps all tappable targets and their explicit destinations or state changes based on the actual Next.js routing in the repository.

## Global Chrome (FloatingNav.tsx)
Visible on almost all screens (except `/sign-in`).

* **Home Button (Blob icon)**:
  * In Lobby/Menus -> Links to `/` (Home)
  * In Active Gameplay -> Triggers `window.confirm` ("Leave this puzzle?"). If OK -> navigates to `/`.
* **Daily Badge (Flame icon)**: Links to `/daily`
* **Level Path (Map icon)**: Links to `/level-path`
* **Race (Race flags icon)**: Links to `/play/race/lobby`
* **Audio (Mixer icon)**: Toggles the audio mixer bottom sheet (state change, no route change).
* **Account Avatar**:
  * If signed in -> Links to `/profile`
  * If guest -> Links to `/sign-in`

## `/` (Home)
* **Account Avatar (top right)**: Links to `/profile` (if signed in) or `/sign-in` (if guest).
* **Daily Challenge Card**: `window.location.href='/daily'`
* **Level Path Teaser Card**: `window.location.href='/level-path'`
* **Race a Friend Card**: Links to `/play/race/lobby`
* **Butterfly Collection Card**: Links to `/profile`
* **Standard (Free Play) Button**: Links to `/play/standard`

## `/sign-in`
* **Sign in with Google**: Triggers `supabase.auth.signInWithOAuth` (redirects to Google, returns to app).
* **Continue as Guest**: Triggers `router.push('/')` (Home).

## `/daily`
* **Come Back Tomorrow Overlay (if completed)**: No explicit link, relies on FloatingNav.
* **Gameplay**: Uses `GameClient`. Completion overlay has no explicit exit links, relies on FloatingNav.

## `/level-path`
* **Unlocked Level Node**: Sets `selectedLevel` state -> Opens Bottom Sheet Modal.
* **Locked Level Node**: Non-interactive `<div>` or `<button disabled>`.
* **Play Level Button (in Modal)**: Links to `/level-path/[levelId]`

## `/level-path/[levelId]` (Level Gameplay)
* **Start**: Hardcoded puzzle generation via URL param.
* **Completion Overlay**: 
  * **Next Level**: Links to `/level-path/[nextLevelId]`. If max level, says "More Levels Coming Soon".
  * **Home**: Links to `/`

## `/play/standard` (Setup)
* **Theme Cards**: State change (`setTheme`).
* **Difficulty Toggle**: State change (`setDiff`).
* **Start Puzzle Button**: Links to `/play/standard/[theme]/[diff]`.

## `/play/standard/[...slug]` (Standard Gameplay)
* **Completion Overlay**:
  * **Next Puzzle**: Links to `/play/standard/standard/[diff]` (hardcodes 'standard' theme currently).
  * **Home**: Links to `/`

## `/play/race/lobby`
* **Join Room Tab**: State change (`setMode('join')`).
* **Create Room Tab**: State change (`setMode('create')`).
* **Join Race Button**: Triggers `router.push('/play/race/[code]')`.
* **Start New Room Button**: Generates code, saves `is_leader_[code]` in sessionStorage, triggers `router.push('/play/race/[code]')`.

## `/play/race/[roomCode]`
* **Lobby Phase**:
  * **Leader Difficulty Selection**: State change + Realtime broadcast.
  * **Guest Difficulty Selection**: Disabled/Read-only.
  * **Ready Button**: State change + Realtime broadcast.
  * **Start Game Button (Leader)**: Triggers Realtime broadcast (`start_race`) -> Transition to Countdown phase.
* **Gameplay Phase**:
  * **Banter Chat Button**: Toggles chat chip tray (state change).
  * **Chat Presets**: Realtime broadcast (`chat_message`).
* **Results Phase**:
  * **Rematch Button**: Realtime broadcast (`rematch`) -> State reset to lobby phase.
  * **Change Difficulty / Home Button**: Triggers `router.push('/')`.

## `/profile`
* **Settings Gear Icon**: Links to `/settings`.
* **Butterfly Collection Grid**:
  * **Earned Butterfly Node**: State change (`setSelectedButterfly`) -> Opens detail modal.
  * **Empty Node**: Non-interactive.

## `/settings`
* **Appearance Toggles**: State change (`setTheme`) + writes to localStorage.
* **Volume Sliders**: State change (`setVolume`) + writes to localStorage.
* **Start Ambience Button**: Initializes `AudioContext` (state change).
* **Sign Out Button**: Triggers `supabase.auth.signOut()` + `router.push('/')`.
* **Delete My Data Button**: Triggers `window.confirm` -> backend deletion -> `router.push('/')`.
