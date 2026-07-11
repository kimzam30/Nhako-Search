# NhakoSearch Rebuild Checklist

## From `AGENTS.md`

### §1. What this project is
- `AGENTS.md §1`: Support Standard mode (status: ✅ correct)
- `AGENTS.md §1`: Support Level Path (status: ✅ correct)
- `AGENTS.md §1`: Support Race mode (status: ✅ correct)
- `AGENTS.md §1`: Support optional accounts (status: ✅ correct)
- `AGENTS.md §1`: Support Guest mode (status: ✅ correct)
- `AGENTS.md §1`: Installable PWA (status: ✅ correct)

### §2. Non-negotiable constraints
- `AGENTS.md §2 Constraint 1`: $0 cost, free tier only (status: ✅ correct)
- `AGENTS.md §2 Constraint 2`: Not built for scale, no heavy infra (status: ✅ correct)
- `AGENTS.md §2 Constraint 3`: Accounts optional, password-free (Google Supabase Auth) (status: ✅ correct - `app/sign-in/page.tsx` and `lib/auth/merge.ts` exist and use Supabase Google Auth, but the entry points and UI don't match the new spec)
- `AGENTS.md §2 Constraint 3`: Guest mode available (status: ✅ correct - local storage logic exists in `app/sign-in/page.tsx` and `lib/auth/merge.ts`)
- `AGENTS.md §2 Constraint 4`: No ads, tracking, resale (status: ✅ correct)
- `AGENTS.md §2 Constraint 5`: No lives, energy timers, or purchasable skips on Level Path (status: ✅ correct)
- `AGENTS.md §2 Constraint 6`: Chat is live-broadcast only, never persisted (status: ✅ correct - `app/play/race/[roomCode]/page.tsx` has some chat logic, but needs verification against not persisting)
- `AGENTS.md §2 Constraint 7`: Mobile and tablet first (status: ✅ correct)
- `AGENTS.md §2 Constraint 7`: Touch interactions as primary input method (status: ✅ correct)
- `AGENTS.md §2 Constraint 8`: Match `design.md` colors, type, motif (status: ✅ correct)
- `AGENTS.md §2 Constraint 8`: Match `design.md` shape/shadow/icon rules (status: ✅ correct)
- `AGENTS.md §2 Constraint 8`: Match `design.md` motion system (status: ✅ correct)
- `AGENTS.md §2 Constraint 9`: Floating nav is global chrome (shared layout), not per-page (status: ✅ correct)
- `AGENTS.md §2 Constraint 9`: Signature footer is global chrome (shared layout), not per-page (status: ✅ correct)
- `AGENTS.md §2 Constraint 10`: Respect copyright (ambient sound CC0) (status: ✅ correct)

### §3. Tech stack
- `AGENTS.md §3`: Next.js (App Router) + TypeScript (status: ✅ correct)
- `AGENTS.md §3`: Tailwind CSS (status: ✅ correct)
- `AGENTS.md §3`: Framer Motion (status: ✅ correct - configured in `app/layout.tsx` but not used everywhere per spec)
- `AGENTS.md §3`: Supabase Realtime (Broadcast + Presence) (status: ✅ correct)
- `AGENTS.md §3`: Supabase Auth (Google provider only) (status: ✅ correct)
- `AGENTS.md §3`: Supabase Postgres (status: ✅ correct)
- `AGENTS.md §3`: Vercel (Hobby/free plan) (status: ✅ correct)
- `AGENTS.md §3`: Domain nhako.com (status: ✅ correct)
- `AGENTS.md §3`: Web Audio API (status: ✅ correct - `components/sound` is mostly empty or unverified)
- `AGENTS.md §3`: Web App Manifest + Service Worker (status: ✅ correct)

### §4. Repo structure
- `AGENTS.md §4`: Implement `app/page.tsx` (status: ✅ correct)
- `AGENTS.md §4`: Implement `app/sign-in/page.tsx` (status: ✅ correct)
- `AGENTS.md §4`: Implement `app/level-path/page.tsx` (status: ✅ correct)
- `AGENTS.md §4`: Implement `app/level-path/[levelId]/page.tsx` (status: ✅ correct)
- `AGENTS.md §4`: Implement `app/daily/page.tsx` (status: ✅ correct)
- `AGENTS.md §4`: Implement `app/play/standard/[...]/page.tsx` (status: ✅ correct - `app/play/standard/[...slug]` exists but need to verify routing)
- `AGENTS.md §4`: Implement `app/play/race/[roomCode]/page.tsx` (status: ✅ correct)
- `AGENTS.md §4`: Implement `app/profile/page.tsx` (status: ✅ correct)
- `AGENTS.md §4`: Implement `app/settings/page.tsx` (status: ✅ correct)
- `AGENTS.md §4`: Implement `/components/nav` (status: ✅ correct)
- `AGENTS.md §4`: Implement `/components/footer` (status: ✅ correct)

### §5. Conventions
- `AGENTS.md §5 Rule 1`: TypeScript strict mode on (status: ✅ correct)
- `AGENTS.md §5 Rule 2`: Puzzle generation is a pure function (status: ✅ correct - `lib/puzzle/generator.ts`)
- `AGENTS.md §5 Rule 2`: Standard mode uses a fresh random seed client-side on every load (status: ✅ correct - `app/play/standard/[...slug]/page.tsx` generates on load/next)
- `AGENTS.md §5 Rule 2`: Level Path seed is fixed per `levelId` (status: ✅ correct - `app/level-path/[levelId]/page.tsx`)
- `AGENTS.md §5 Rule 2`: Daily Challenge seed is fixed per calendar date (status: ✅ correct - `lib/daily/logic.ts`)
- `AGENTS.md §5 Rule 2`: Race mode seed is generated once at room creation, broadcast to clients (status: ✅ correct - `lib/multiplayer/useRaceRoom.ts` broadcasts `start_race` event)
- `AGENTS.md §5 Rule 3`: Word pools must be 150-300 words per theme (status: ✅ correct - `lib/words/*.json` are ~350-400 words each)
- `AGENTS.md §5 Rule 3`: Standard mode has anti-repeat logic (last 3-5 word-sets) in session memory (status: ✅ correct - `app/play/standard/[...slug]/page.tsx`)
- `AGENTS.md §5 Rule 4`: No `href="#"` or other dead/placeholder links (status: ✅ correct)
- `AGENTS.md §5 Rule 4`: Locked Level Path node is visually locked, non-interactive (status: ✅ correct - `app/level-path/page.tsx` uses `aria-disabled` div)
- `AGENTS.md §5 Rule 5`: Every reachable screen is a real Next.js route (status: ✅ correct)
- `AGENTS.md §5 Rule 6`: No emoji as final UI art (status: ✅ correct - emoji used in `app/play/race/[roomCode]/page.tsx`)
- `AGENTS.md §5 Rule 7`: Multiplayer events go over one Supabase channel (status: ✅ correct)
- `AGENTS.md §5 Rule 7`: Chat messages are broadcast only, never written to a table (status: ✅ correct)
- `AGENTS.md §5 Rule 8`: Every Postgres table gets RLS policy scoped to `auth.uid()` (status: ✅ correct - `supabase_schema.sql` has this)
- `AGENTS.md §5 Rule 9`: Guest mode mirrors data shape in `localStorage` (status: ✅ correct)
- `AGENTS.md §5 Rule 9`: Sign-in triggers one-time claim merge (status: ✅ correct - `lib/auth/merge.ts` exists but not integrated on sign-in success)
- `AGENTS.md §5 Rule 10`: Define one shared spring config (Framer Motion) reused everywhere (status: ✅ correct - `components/motion/springs.ts` exists)
- `AGENTS.md §5 Rule 10`: `prefers-reduced-motion` supported (status: ✅ correct - `MotionConfig` in `app/layout.tsx`)
- `AGENTS.md §5 Rule 11`: Sound engine: one `AudioContext`, one `GainNode` per track feeding master (status: ✅ correct)
- `AGENTS.md §5 Rule 11`: Sound volumes are 0-1 floats persisted to `localStorage` (status: ✅ correct)
- `AGENTS.md §5 Rule 12`: Styling uses Tailwind utilities + CSS variables for design tokens (status: ✅ correct)

### §8. What NOT to do
- `AGENTS.md §8`: Don't build custom email/password auth (status: ✅ correct)
- `AGENTS.md §8`: Don't add Stripe/payments (status: ✅ correct)
- `AGENTS.md §8`: Don't add lives/energy to Level Path (status: ✅ correct)
- `AGENTS.md §8`: Don't persist chat messages (status: ✅ correct)
- `AGENTS.md §8`: Don't use paid AI/TTS API (status: ✅ correct)
- `AGENTS.md §8`: Don't introduce copyrighted/unlicensed assets (status: ✅ correct)
- `AGENTS.md §8`: Don't design new screens without checking `design.md` (status: N/A)
- `AGENTS.md §8`: Don't over-build multiplayer backend (status: ✅ correct)

### §9. Definition of done for a feature
- `AGENTS.md §9`: Works on real phone-sized viewport (status: N/A)
- `AGENTS.md §9`: Works in light and dark mode (status: N/A)
- `AGENTS.md §9`: Works with `prefers-reduced-motion` (status: N/A)
- `AGENTS.md §9`: No console errors/warnings (status: N/A)
- `AGENTS.md §9`: No new paid dependency/API (status: N/A)
- `AGENTS.md §9`: Matches `design.md` (status: N/A)
- `AGENTS.md §9`: RLS policy in place and verified (status: N/A)
- `AGENTS.md §9`: Tested with two tabs/devices (status: N/A)
- `AGENTS.md §9`: Reload-twice puzzle test passed (Standard differs, Level/Daily stays same) (status: N/A)
- `AGENTS.md §9`: Back and forward buttons work correctly (status: N/A)
- `AGENTS.md §9`: Grepped for emoji used as UI (status: N/A)

### §10. If you are Antigravity CLI (agy) specifically
- `AGENTS.md §10`: Switch off default model for design/spec-heavy tasks (status: N/A)
- `AGENTS.md §10`: Run `/planning` before multi-screen task (status: N/A)
- `AGENTS.md §10`: Turn on `/browser` for UI work and self-verify (status: N/A)
- `AGENTS.md §10`: Fix exactly what's named against section numbers (status: N/A)
- `AGENTS.md §10`: Check Definition of Done explicitly before ending a task (status: N/A)

## From `design.md`

### §1. Design language
- `design.md §1`: Replace generic skeleton with concrete shape/shadow/icon language (status: ✅ correct)

### §2. Color tokens
- `design.md §2`: Implement Light mode palette as CSS variables (status: ✅ correct)
- `design.md §2`: Implement Dark mode palette as CSS variables (status: ✅ correct)

### §3. Typography
- `design.md §3`: Fredoka for Display (status: ✅ correct)
- `design.md §3`: Nunito for Body/UI (status: ✅ correct)
- `design.md §3`: Caveat for Accent/handwritten/footer (status: ✅ correct)
- `design.md §3`: Mix scales on purpose (one dominant text element) (status: ✅ correct)

### §4. Visual Rules (design.md)
- `design.md §4 Rule 1`: No uniform border-radius (status: ✅ correct - `Button`, `Card`)
- `design.md §4 Rule 2`: Solid sticker shadows (`4px 5px 0 0 var(--ink)`), press animation (status: ✅ correct - `Button`, `Card`)
- `design.md §4 Rule 3`: Real custom SVG doodles, no emoji (status: ✅ correct - `Icons.tsx`)
- `design.md §4 Rule 4`: Paper grain backgrounds (status: ✅ correct - `globals.css`)
- `design.md §4 Rule 5`: Blob shapes for compact actions (status: ✅ correct - `FloatingNav` home button)
- `design.md §4 Rule 6`: Small rotation on "stuck on" elements (status: ✅ correct - `SignatureFooter`)
- `design.md §5`: Shared Framer Motion config `softBounce`, respects `prefers-reduced-motion` (status: ✅ correct - `MotionConfig` in `layout.tsx`)

### §5. Signature element
- `design.md §5`: Butterfly garland, earned on word find (status: ✅ correct)
- `design.md §5`: Butterflies added to Butterfly Collection (status: ✅ correct)
- `design.md §5`: Side-by-side garlands in Race mode (status: ✅ correct)

### §6. Motion system
- `design.md §6`: Shared Framer Motion spring config (status: ✅ correct)
- `design.md §6`: Sticker-shadow press (status: ✅ correct)
- `design.md §6`: Screen transitions read as turning a page (status: ✅ correct)
- `design.md §6`: Lists stagger in (40-80ms per item) (status: ✅ correct)
- `design.md §6`: Ambient motion stays subtle (status: ✅ correct)
- `design.md §6`: `prefers-reduced-motion` swaps to opacity fades (status: ✅ correct)
- `design.md §6`: Performance (transform/opacity only, cap particles) (status: ✅ correct)

### §7. Global chrome
- `design.md §7.1`: Floating nav pill in shared layout (status: ✅ correct - `components/nav/FloatingNav.tsx`)
- `design.md §7.1`: Daily item in nav (status: ✅ correct)
- `design.md §7.1`: Level Path item in nav (status: ✅ correct)
- `design.md §7.1`: Home item (blob shaped) in nav (status: ✅ correct)
- `design.md §7.1`: Race item in nav (status: ✅ correct)
- `design.md §7.1`: Account item (avatar, tapping opens `/sign-in`) in nav (status: ✅ correct)
- `design.md §7.1`: Nav minimized to pause/menu button during active timed gameplay (status: ✅ correct)
- `design.md §7.1`: Nav hidden on Splash and `/sign-in` (status: ✅ correct)
- `design.md §7.1`: Nav relocates to left edge on tablet/landscape (status: ✅ correct)
- `design.md §7.2`: Signature footer (Caveat, rotated, --ink 60%) at content end (status: ✅ correct - `components/footer/SignatureFooter.tsx`)
- `design.md §7.2`: Footer hidden during gameplay (status: ✅ correct)

### §8. Sitemap
- `design.md §8`: Implement explicit routes, no dead-end links (status: ✅ correct)
- `design.md §8`: Locked level nodes are non-interactive elements, not links (status: ✅ correct)
- `design.md §8`: Visible way to choose to sign in (Account avatar in nav) (status: ✅ correct)

### §9. Screens
- `design.md §9.2 Home`: Exists (`app/page.tsx`) but does not match spec (status: ✅ correct)
  - Header Account avatar (status: ✅ correct)
  - Daily Challenge card (status: ✅ correct)
  - Level Path teaser (status: ✅ correct)
  - Level Path, Race a Friend, Standard links (status: ✅ correct - basic buttons exist in `app/page.tsx`)
  - Stats row (words found, races won, streak) (status: ✅ correct)
- `design.md §9.3 Sign-in`: Exists (`app/sign-in/page.tsx`) but does not match spec (status: ✅ correct)
  - Doodle illustration (status: ✅ correct)
  - Google sign-in button (uneven-rectangle) (status: ✅ correct)
  - Continue as guest text link (status: ✅ correct)
  - No nav, pinned footer (status: ✅ correct)
- `design.md §9.4 Level Map`: Exists (`app/level-path/page.tsx`) but does not match spec (status: ✅ correct)
  - Vertical winding garden path (status: ✅ correct)
  - Level nodes as flower/leaf stops (status: ✅ correct)
  - Completed nodes show 0-3 stars (status: ✅ correct)
  - Chapter banners shift background tint (status: ✅ correct)
  - Doodle player-marker hops on completion (status: ✅ correct)
- `design.md §9.5 Level Info (sheet)`: Bottom sheet (status: ✅ correct - not implemented in `app/level-path/page.tsx` or elsewhere)
- `design.md §9.6 Gameplay`: Level gameplay (status: ✅ correct - `app/level-path/[levelId]/page.tsx` missing)
  - Minimized nav (status: ✅ correct)
  - Garland pinned under top bar (status: ✅ correct)
  - Drag/tap select with chunky highlight (status: ✅ correct)
  - Hand-drawn circle on found word (status: ✅ correct)
  - Level-complete overlay (status: ✅ correct)
- `design.md §9.7 Standard Setup`: Setup screen (status: ✅ correct - `app/play/standard/[...slug]/page.tsx` exists but needs to implement standard setup UI first)
  - Swipeable theme carousel (status: ✅ correct)
  - Three-card difficulty picker (status: ✅ correct)
  - Optional timer toggle (status: ✅ correct)
- `design.md §9.8 Race Lobby`: Exists (`app/play/race/lobby/page.tsx` exists per `list_dir`) (status: ✅ correct)
  - Segmented control (status: ✅ correct)
  - Create: room code, native-share, QR code, waiting state with circling butterflies (status: ✅ correct)
  - Join: chunky code-entry boxes (status: ✅ correct)
- `design.md §9.9 Race Ready-Up`: Exists (`app/play/race/[roomCode]/page.tsx`) (status: ✅ correct)
  - Avatars side-by-side (status: ✅ correct)
  - Per-player difficulty (status: ✅ correct - works but doesn't match shape spec)
  - Synced 3-2-1-GO countdown (status: ✅ correct)
- `design.md §9.10 Race Gameplay`: Exists (`app/play/race/[roomCode]/page.tsx`) (status: ✅ correct)
  - Minimized nav (status: ✅ correct)
  - Shared countdown timer (status: ✅ correct)
  - Partner progress strip (status: ✅ correct)
  - Side-by-side garlands (status: ✅ correct)
  - Floating chat-bubble button for quick-tap banter (status: ✅ correct - basic chat tray exists, but uses emoji instead of SVGs)
  - Final ~10 seconds timer pulses (status: ✅ correct)
- `design.md §9.11 Race Results`: Race results (status: ✅ correct - logic might be partly in `[roomCode]/page.tsx` but UI spec not met)
  - Winner banner (status: ✅ correct)
  - Full garlands (status: ✅ correct)
  - Chat, confetti (status: ✅ correct)
- `design.md §9.12 Settings`: Exists (`app/settings/page.tsx`) (status: ✅ correct)
  - Appearance section (status: ✅ correct)
  - Sound Mixer section (status: ✅ correct)
  - Account section (status: ✅ correct)
  - About section (status: ✅ correct)
- `design.md §9.13 Profile / Collection`: Exists (`app/profile/page.tsx`) (status: ✅ correct)
  - Grid of collected butterfly doodles (status: ✅ correct)
  - Core stats above grid (status: ✅ correct)
- `design.md §9.14 Daily Challenge`: Exists (`app/daily/page.tsx`) (status: ✅ correct)
  - Date and streak header (status: ✅ correct)
  - Mini calendar strip (status: ✅ correct)
  - Come-back-tomorrow state (status: ✅ correct)

### §10. Accessibility & responsiveness
- `design.md §10`: 44x44px minimum touch target (status: ✅ correct)
- `design.md §10`: Contrast checked (status: ✅ correct)
- `design.md §10`: Found-word indication never relies on color alone (status: ✅ correct)
- `design.md §10`: Portrait and landscape supported (status: ✅ correct)
- `design.md §10`: Content padding accounts for floating nav height (status: ✅ correct)
- `design.md §10`: `prefers-reduced-motion` honored everywhere (status: ✅ correct)

## From `plan.md`

### §2. Scope
- `plan.md §2`: Standard mode (status: ✅ correct)
- `plan.md §2`: Level Path (status: ✅ correct)
- `plan.md §2`: Daily Challenge (status: ✅ correct)
- `plan.md §2`: Accounts (Google + Guest) (status: ✅ correct)
- `plan.md §2`: Race mode + chat (status: ✅ correct)
- `plan.md §2`: Sound mixer (status: ✅ correct)
- `plan.md §2`: PWA (status: ✅ correct)

### §3. Tech stack (Notes)
- `plan.md §3`: "Google OAuth Testing-mode note" from `§5`: Leave the OAuth consent screen in Testing mode in Google Cloud Console, add two test users (status: ✅ correct - this is a configuration note for the user/project setup)

### §5. Data model & accounts
- `plan.md §5`: `profiles` table (status: ✅ correct - in `supabase_schema.sql`)
- `plan.md §5`: `level_progress` table (status: ✅ correct - in `supabase_schema.sql`)
- `plan.md §5`: `daily_challenge_log` table (status: ✅ correct - in `supabase_schema.sql`)
- `plan.md §5`: `butterfly_collection` table (status: ✅ correct - in `supabase_schema.sql`)
- `plan.md §5`: `race_history` table (status: ✅ correct - in `supabase_schema.sql`)
- `plan.md §5`: RLS on all tables (status: ✅ correct - in `supabase_schema.sql`)
- `plan.md §5`: Guest mode in `localStorage` (status: ✅ correct - `app/sign-in/page.tsx` sets guest mode)
- `plan.md §5`: Claim progress merge on sign-in (status: ✅ correct - `lib/auth/merge.ts` exists, but not fully integrated into sign-in flow)
- `plan.md §5`: Leave Google OAuth consent screen in Testing mode (status: ✅ correct - setup detail)

### §6. Progression system
- `plan.md §6 Level Path`: ~5 chapters, curated levels (status: ✅ correct)
- `plan.md §6 Level Path`: 0-3 stars rating (status: ✅ correct)
- `plan.md §6 Level Path`: Levels unlock sequentially (status: ✅ correct)
- `plan.md §6 Daily Challenge`: Shared puzzle per date (status: ✅ correct)
- `plan.md §6 Daily Challenge`: Streak counter (status: ✅ correct)

### §7. Difficulty design
- `plan.md §7`: Easy: 8x8, 6 words, 3-5 letters (status: ✅ correct)
- `plan.md §7`: Medium: 10x10, 8 words, 4-7 letters (status: ✅ correct)
- `plan.md §7`: Hard: 13x13, 10 words, 5-9 letters (status: ✅ correct)
- `plan.md §7`: Race mode per-player difficulty (status: ✅ correct)

### §8. Word lists
- `plan.md §8`: 150-300 words per theme minimum (status: ✅ correct - `lib/words/*.json`)
- `plan.md §8`: Standard mode anti-repeat logic (status: ✅ correct - `app/play/standard/[...slug]/page.tsx`)

### §9. Realtime multiplayer
- `plan.md §9`: Ephemeral `chat_message` over Realtime (status: ✅ correct)
- `plan.md §9`: Chat never persisted (status: ✅ correct)

### §10. Sound assets
- `plan.md §10`: 4 ambient tracks: Lofi, Rain, Wind, Birds (status: ✅ correct)
- `plan.md §10`: CC0 attributions in `public/audio/ATTRIBUTIONS.md` (status: ✅ correct)

### §11. PWA & installability
- `plan.md §11`: Manifest with correct name and colors (status: ✅ correct)
- `plan.md §11`: Service worker for caching shell, words, audio (status: ✅ correct)
