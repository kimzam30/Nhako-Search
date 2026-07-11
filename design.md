# design.md — NhakoSearch

*Updated: added accounts, level path, daily challenge, in-race chat, and a full motion system —
this revision adds §5 (Motion System) and §6 (full screen-by-screen walkthrough) and expands the
signature element to feed a persistent collection.*

## 0. Brief, in one line
A cozy, hand-drawn word-search game two people play together — it should feel like doodling in
a shared notebook in a garden full of butterflies that remembers your progress, not like a
generic puzzle-app UI kit.

## 1. Design language
**Mood words:** cartoonish, doodled, soft, playful, a little romantic, unhurried, *alive*.

**What to avoid:** flat corporate "puzzle app" UI, stock emoji butterflies, cliché "Comic Sans"
cartoon fonts, and — now that there's a level path — anything that borrows Candy Crush's
*pressure* tactics (lives, timers-as-punishment, paywalled skips). Borrow its structure, not its
psychology.

## 2. Color tokens

### Light mode — "Paper & Blossom"
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#FFF6F8` | App background — warm blush paper, not pure white |
| `--surface` | `#FFE3ED` | Cards, grid backing, panels |
| `--ink` | `#4A1942` | Primary text, doodle line art, grid borders — deep plum, like fountain-pen ink |
| `--accent` | `#FF6FA5` | Primary buttons, active states, selected letters |
| `--accent-soft` | `#FFC1D9` | Hover states, secondary chips, unselected word-list pills |
| `--found` | `#7FCB9C` | Found-word circle + strikethrough — deliberately *not* pink, so "found" reads instantly |
| `--gold` | `#FFD166` | Butterfly wing highlights, sparkles, stars, win-screen confetti |

### Dark mode — "Night Garden"
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#241326` | App background — twilight plum, not black |
| `--surface` | `#341B3B` | Cards, grid backing |
| `--ink` | `#FFE9F4` | Primary text, line art on dark |
| `--accent` | `#FF8FC0` | Primary buttons / active states |
| `--accent-soft` | `#4A2A52` | Hover / secondary surfaces |
| `--found` | `#6FE3A6` | Found-word indicator (brighter mint for dark contrast) |
| `--gold` | `#C77DFF` | Butterflies/stars glow like fireflies at night instead of gold |

Check both palettes against WCAG AA for body text before shipping.

## 3. Typography
- **Display / headings — "Fredoka."** Logo, mode titles, timer digits, star counts, win/lose
  banners, level numbers.
- **Body / UI — "Nunito."** Everything a player must read to function — buttons, word lists,
  settings, chat.
- **Accent / handwritten — "Caveat."** Personality moments only: tooltip call-outs, room-code
  note, encouragement bubbles. Never load-bearing text.

## 4. Signature element: the Butterfly Garland → the Collection
Instead of a generic checklist + "6/10 found" counter, finding a word releases a small
hand-drawn butterfly that flutters up and lands on a **garland** at the top of the screen. Each
butterfly is a slightly different doodle (wing pattern/color pulled from the palette), so it
feels *collected*, not mechanical.

What's new this round: every unique butterfly you ever earn — across level play, standard play,
daily challenges, and races — is kept permanently in your **Butterfly Collection** (see §6.13).
The garland is the in-the-moment payoff; the Collection is what makes that payoff *last*, which
is what gives the level-path/progress system real weight without needing lives, currency, or
timers to manufacture stakes.

In **Race mode**, both players' garlands sit side by side, growing independently — glancing at
the top of the screen tells you who's ahead without reading numbers.

**This must be real SVG doodle art, not the 🦋 emoji character.** Emoji reads as a generic
placeholder no matter how good the surrounding palette is — it's the fastest way to make a
custom-illustrated app look like a template. Emoji is fine as a throwaway dev placeholder, never
as shipped UI.

## 5. Motion system
This app now leans into fluid, springy motion throughout — not just one signature moment. To
keep that from becoming noisy or slow, everything shares one set of rules:

- **One shared spring, reused everywhere.** Define a single "soft bounce" spring config (medium
  stiffness, low damping) once and reuse it for buttons, cards, sheets, and the garland — so
  every motion in the app feels like it came from the same hand, not a grab-bag of easing
  curves. Recommend **Framer Motion** (free, MIT-licensed, pairs natively with React/Next.js) so
  this is a config value, not hand-rolled physics per component.
- **Screen transitions are "turning a page," not sliding a panel.** Prefer shared-element/morph
  transitions where it makes sense (a level node grows into the gameplay card; the sign-in
  butterflies burst into the home screen) over generic slide/fade — it reinforces the notebook
  concept already in the grid design.
- **Every tap responds within ~100ms** — a small scale/bounce on press, no exceptions, even on
  secondary buttons.
- **Lists stagger in**, 40–80ms per item (word pills, level nodes, the collection grid) — enough
  to feel alive without feeling slow to settle.
- **Ambient/idle motion stays subtle** — background butterflies drifting, a small idle flutter
  near the avatar — low amplitude, slow, so it adds life without pulling focus from gameplay.
- **Spend your biggest motion budget on real payoffs**, not routine navigation: word found →
  garland flight, level complete → stars flying in, race win → celebration, path-hop on level
  complete. Keep everyday navigation quick and quiet by comparison, or the payoffs stop feeling
  special.
- **Respect `prefers-reduced-motion` system-wide** — swap to simple opacity fades, no parallax,
  no particles, still fully functional.
- **Performance:** animate `transform`/`opacity` only (GPU-friendly), cap simultaneous particles
  (e.g. ~12 confetti doodles max) so it stays smooth on an older phone, use `will-change`
  sparingly.

## 6. Screens — full walkthrough

### 6.1 Splash
- **Purpose:** cold-start branding moment when launched from the home-screen icon (no browser
  chrome).
- **Layout:** centered Fredoka wordmark on `--bg`; a couple of doodle butterflies drift in from
  the edges and settle around it.
- **Motion:** butterflies flutter in and land, then the splash "opens like a book" into
  Sign-in/Home. ≤1.5s on true cold start; a fast, near-instant fade on quick re-opens so it
  never feels like it's stalling you.

### 6.2 Sign-in / Welcome
- **Purpose:** first-run identity choice.
- **Layout:** a warm doodle illustration (two butterflies meeting — a small nod to the "for two"
  premise), one line of copy ("Save your progress and race your favorite person."), a primary
  **"Sign in with Google"** button, and a secondary **"Continue as guest"** text link below it.
- **States:** loading (during OAuth redirect), error (simple retry, no scary red banner — this
  is a low-stakes app).
- **Motion:** button press = soft bounce; successful sign-in triggers a quick garland-burst
  transition straight into Home.

### 6.3 Home / Dashboard
- **Purpose:** central hub — everything else is one tap away.
- **Layout (top → bottom, mobile scroll):**
  1. Header: avatar (Google photo in a doodle circular frame) + name, settings gear top-right.
  2. **Daily Challenge card** — today's theme, streak count (small flame-butterfly icon), "Play
     Today's Puzzle" button. Placed first since it's the "come back today" hook.
  3. **Level Path teaser card** — "Chapter 2: Rainy Day · Level 14," a mini path preview,
     "Continue" button.
  4. Two primary buttons: **Level Path** and **Race a Friend**. "Standard (free play)" is a
     smaller tertiary link beneath them — the level path is the main progression hook, standard
     mode is there for casual no-pressure play.
  5. A small stats row: total words found, races won vs. partner, current streak.
- **Motion:** cards stagger in on load (fade + rise, ~60–80ms offset each); daily-streak icon
  has a subtle idle flicker.

### 6.4 Level Map (Path)
- **Purpose:** the Candy-Crush-style progression visual — but a garden path, not a candy trail.
- **Layout:** a vertical winding path, scrollable, with level nodes as flower/leaf stops. Each
  completed node shows 0–3 stars; locked nodes are greyed with a closed-bud icon; the
  current/next level pulses gently. Chapter banners mark themed zones (Garden → Rainy Day →
  Cozy Cottage → Night Sky → Date Night), with a subtle background-tint shift per chapter.
- **Key interaction:** a small player-marker (doodle avatar or butterfly) sits on your current
  node and visibly **hops forward** with a spring animation each time you complete a level —
  the signature moment of this screen.
- **Motion:** path auto-scrolls to center your current level on entry; background elements
  (clouds, leaves) parallax-scroll slower than the path for depth.

### 6.5 Level Info (bottom sheet)
- **Purpose:** quick pre-level check before committing.
- **Layout:** level number + chapter theme, star-requirement hints (e.g. "★★★ — finish with
  time to spare"), a difficulty badge, primary **Play** button, small close (×).
- **Motion:** sheet slides up with spring physics; backdrop dims/blurs.

### 6.6 Gameplay — Level & Standard (shared component)
- **Purpose:** the core word-search loop, used by both Level Path and free-play Standard mode
  (context banner differs; mechanics are identical).
- **Layout:** top bar (back, level/theme label, optional timer, pause) → butterfly garland strip
  pinned just under the top bar → grid card, centered → word-list pills below the grid on phone
  portrait, beside it on tablet/landscape.
- **Interaction:** drag or tap-sequence letter selection with a chunky rounded highlight path; a
  found word gets a hand-drawn wobbly circle in `--found`, plus its butterfly launches from that
  spot into the garland.
- **States:** paused overlay (soft blur, Resume/Quit); level-complete overlay (stars animate in
  one at a time, word summary, Next Level / Retry / Map). **No fail state in Level mode** — you
  can always finish; stars simply reflect how well you did. (Race mode is the only place a hard
  timer can end the round — see §6.10.)
- **Motion:** letter cells get a tiny press-scale bounce; a found word-pill animates from the
  list into its "found" state as the strikethrough draws itself; stars fly in with a quick pop.

### 6.7 Standard (Free Play) Setup
- **Purpose:** pick a theme + difficulty for untracked, no-pressure play — doesn't touch Level
  Path progress.
- **Layout:** swipeable theme carousel, three-card difficulty picker, optional timer toggle
  (off by default), Start button.
- **Motion:** carousel snaps with a light card-tilt on swipe.

### 6.8 Race Lobby — Create / Join
- **Purpose:** stand up a 2-player race room.
- **Layout:** segmented control "Create Room" / "Join Room." Create shows a large shareable room
  code, a native-share button, and a QR code (handy phone-to-phone in the same room), then a
  "waiting for your partner…" state. Join shows a big chunky code-entry field.
- **Motion:** the waiting state shows two doodle butterflies circling each other; when the
  second player connects, they "meet" with a small sparkle burst.

### 6.9 Race Ready-Up
- **Purpose:** each player locks in their own difficulty and confirms ready before the grid is
  revealed.
- **Layout:** both players' avatars/names side by side; each edits only their own difficulty
  (partner's is shown read-only); a Ready toggle per player; once both are ready, a synced
  3-2-1-GO countdown plays for both.
- **Motion:** countdown numerals pop in large Fredoka type with a big bounce; "GO" triggers a
  garland-strip sweep straight into gameplay.

### 6.10 Race Gameplay (with banter chat)
- **Purpose:** the timed race itself.
- **Layout:** shared countdown timer, big, top-center. Your own grid + word list is the primary
  focus (full width on phone). A slim strip shows your partner's *live progress* only — their
  garland count and a percentage-filled outline of their grid, never their actual letters, to
  keep it a race rather than a spectate. Both garlands sit at the top, yours and theirs, growing
  independently.
- **Quick-chat:** a small floating chat-bubble button in a thumb-reachable corner opens a tray
  of one-tap banter presets — **"GG!", 😤, "So close!", "Nice find!", 🦋, "Hurry up!"** — tapping
  sends instantly as a small speech-bubble doodle that pops up near the sender's garland and
  fades after a couple seconds. No keyboard appears mid-race.
- **States:** low-time warning (final ~10s) — timer pulses gently in `--accent`/`--gold`; kept
  tasteful, not anxiety-inducing.
- **Motion:** incoming banter bubbles pop in with a little wiggle; garland animations run
  slightly snappier here than in Level mode, to match the race's energy.

### 6.11 Race Results
- **Purpose:** celebrate, reflect, maybe go again.
- **Layout:** winner banner in big Fredoka ("You found more! 🦋"), both full garlands side by
  side, stats (words found, time, fastest streak), the same quick-tap banter chips plus a
  **freeform text chat box** now that there's no time pressure, and Rematch / Change Difficulty
  / Home buttons.
- **Motion:** winner's garland gets a celebratory shimmer pass; a brief fall of hand-drawn petal/
  butterfly "confetti" (not generic square confetti), capped at ~12 particles.

### 6.12 Settings
- **Purpose:** preferences + account, in one place.
- **Sections:**
  - **Appearance** — Light / Dark / System toggle.
  - **Sound Mixer** — four doodle-styled sliders (Lofi/cassette icon, Rain/cloud-drip, Wind/
    leaf-swirl, Birds/small-bird), each 0–100%, live-previewing while dragged, freely mixable
    together; a master volume above them; 2–3 tappable presets ("Rainy Study," "Garden
    Morning," "Quiet Night") that set all four at once and remain editable after. First playback
    needs one explicit "▶ Start ambience" tap (mobile autoplay restriction) — styled as a
    friendly doodle button, not a browser error.
  - **Account** — Google profile card, "Sign out," "Delete my data." If in guest mode: a
    "Sign in with Google to save your progress" prompt with a one-tap claim flow instead.
  - **About** — sound-asset attributions, version number.
- **Motion:** sections expand with a smooth height-spring; sliders give a satisfying thumb-bounce
  on release.

### 6.13 Profile / Butterfly Collection
- **Purpose:** the lasting payoff for the Level Path and Daily Challenge — a sticker-album-style
  home for every unique butterfly you've earned.
- **Layout:** a grid of collected butterfly doodles; uncollected slots show as soft silhouettes;
  tapping a collected one shows when/where it was earned (a nice small diary of your shared play
  history). Core stats sit above the grid: levels completed, total words found, race record vs.
  partner, current streak, longest streak.
- **Motion:** newly-collected butterflies (since your last visit) carry a small "new" sparkle
  that clears on tap; the grid stagger-reveals on load.

## 7. Accessibility & responsiveness
- Minimum touch target 44×44px for all interactive elements (letters, buttons, sliders, chat
  chips).
- Both palettes checked for AA text contrast.
- Found-word indication never relies on color alone — wobbly circle + strikethrough pill +
  butterfly all reinforce it.
- Support portrait and landscape on both phone and tablet; the grid scales, it doesn't crop.
- `prefers-reduced-motion` is honored everywhere per §5, not just for the garland.
