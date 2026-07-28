# design.md — NhakoSearch

*Rewritten from scratch. Old version was a reasonable palette/type system wearing a generic
"rounded-card, drop-shadow, Lucide-icon" AI-app skeleton underneath — that skeleton is exactly
what makes an app feel templated no matter how nice the colors are. This version replaces the
skeleton itself: a concrete non-generic shape/shadow/icon language (§4), a persistent floating
nav so home is always one tap away (§7.1), a signature footer (§7.2), an explicit sitemap to
kill the routing confusion (§8), and every screen respec'd against all of it (§9).*

## 0. The idea, in one line
The whole app is **a shared nature journal the two of you keep together** — every screen is a
page in it, not a "screen" in an app. When a design decision is unclear, the test isn't "what
would a puzzle app do here," it's "what would this look like as a page in a journal we keep
together." That single reframe is what should keep this from drifting back into generic
component-library territory.

## 1. Design language: "The Meadow Journal"
**Mood words:** hand-cut, imperfect-on-purpose, warm, unhurried, a little romantic, alive.

**Why the last build read as AI-generated, specifically:** uniform border-radius on every card,
blurred drop-shadows, default icon-set glyphs, flat solid backgrounds, and emoji standing in for
illustration. Every one of those is a default you get for free from a component library — which
is exactly why they all read as "nobody made a decision here." §4 replaces each one with an
explicit, opinionated alternative. Follow §4 literally; it's the difference this time.

## 2. Color tokens
*(unchanged from the previous version — the palette was never the problem)*

### Light mode — "Paper & Blossom"
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#FFF6F8` | App background — warm blush paper |
| `--surface` | `#FFE3ED` | Cards, grid backing, panels |
| `--ink` | `#4A1942` | Text, line art, borders, sticker-shadows — deep plum ink |
| `--accent` | `#FF6FA5` | Primary actions, active states, selected letters |
| `--accent-soft` | `#FFC1D9` | Hover states, secondary chips |
| `--found` | `#7FCB9C` | Found-word indicator — deliberately not pink |
| `--gold` | `#FFD166` | Stars, sparkles, highlights |

### Dark mode — "Night Garden"
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#241326` | Twilight plum background |
| `--surface` | `#341B3B` | Cards, grid backing |
| `--ink` | `#FFE9F4` | Text, line art, borders, sticker-shadows on dark |
| `--accent` | `#FF8FC0` | Primary actions |
| `--accent-soft` | `#4A2A52` | Hover / secondary surfaces |
| `--found` | `#6FE3A6` | Found-word indicator |
| `--gold` | `#C77DFF` | Stars/butterflies glow like fireflies instead of gold |

## 3. Typography
- **Display — "Fredoka."** Logo, mode titles, timer digits, level numbers, star counts.
- **Body/UI — "Nunito."** Anything a player must read to function.
- **Accent/handwritten — "Caveat."** Personality moments and the footer signature (§7.2) only —
  never load-bearing text.
- **Mix scales on purpose.** A screen with one giant Fredoka number and small tight Nunito
  labels reads as designed; a screen where everything is comfortably medium-sized reads as a
  template default. Every primary screen should have one clearly dominant text element.

## 4. Shape, texture & iconography toolkit
This is the part that actually prevents the generic look. Treat every rule as literal, not a
vibe.

**Rule 1 — No uniform border-radius, anywhere.** Every card, sheet, and button uses four
*different* corner values, like it was cut by hand:
```
border-radius: 22px 9px 26px 13px;
```
Vary the four numbers per component (keep them in the 8–28px range) so nothing in the app shares
the exact same radius set. Perfectly symmetric rounding is one of the most reliable "a library
made this" tells there is.

**Rule 2 — No blurred drop-shadows. Use a solid "sticker" shadow instead.**
```
border: 2.5px solid var(--ink);
box-shadow: 4px 5px 0 0 var(--ink);   /* solid, zero blur, zero spread */
```
It should look like a sticker sitting slightly off the page, not like a div floating in
mid-air. On press (see §6), the shadow offset animates toward 0 and the element visually
"presses into" its own shadow — ties the static shape language directly into motion.

**Rule 3 — Real custom icons for anything that matters; no stock icon set "as-is."** Primary
navigation glyphs (home, level path, race, daily flame, account, the garland butterflies, chat
bubble, stars) must be genuinely custom line-doodle SVGs — a single ~2px inked stroke, slightly
irregular/organic path, not a geometrically perfect icon-font glyph. If a base set (e.g. Lucide)
is used anywhere for minor utility icons, it must go through a hand-wobble treatment (a subtle
SVG filter or manually nudged path points) before shipping — never dropped in untouched.
**No emoji as shipped UI**, full stop (carried over from `agents.md` — worth repeating here since
it's a shape/texture rule as much as a content rule).

**Rule 4 — Backgrounds carry paper grain, never a flat solid or a gradient blob.** A faint
tiled noise texture at ~4% opacity (an SVG `feTurbulence` filter or a small tileable PNG) sits
behind every screen. Flat-color-plus-soft-gradient-blob backgrounds are the single most common
generic-AI-app tell — this one rule does a lot of work.

**Rule 5 — Organic "blob" shapes are reserved for compact, icon-only actions.** The floating
nav's Home button (§7.1) is the one place a true amoeba-blob shape belongs:
```
border-radius: 63% 37% 54% 46% / 55% 45% 62% 38%;
```
Buttons carrying real text ("Sign in with Google," "Continue as Guest") stay legible — use the
Rule-1 uneven-rectangle treatment for those instead. Cute should never cost usability; save the
blob for the one button that's just a home icon.

**Rule 6 — Small deliberate rotation on "stuck on by hand" elements.** Badges, the footer
signature, a level's star cluster, a toast/banter bubble — rotate them −2° to −5° so they read
as placed by a person, not laid out on a perfect grid. Primary content (the grid, word lists,
buttons) stays straight; only decorative/secondary elements tilt.

## 5. Signature element: the Butterfly Garland → the Collection
Finding a word releases a hand-drawn butterfly (Rule 3 — real SVG, never 🦋) that flutters up
and lands on a garland strip at the top of the screen. Every unique butterfly you ever earn is
kept permanently in your **Butterfly Collection** (§9.13) — a sticker-album payoff for the
Level Path and Daily Challenge that gives the progress system real weight without lives,
currency, or timers.

In Race mode, both players' garlands sit side by side, growing independently — the race is
visible at a glance without reading a number.

## 6. Motion system
- **One shared spring, reused everywhere** (Framer Motion) — buttons, sheets, the garland, the
  nav's Home button all use the same physics so the whole app feels like it came from one hand.
- **The sticker-shadow press** (§4, Rule 2): every tappable element's shadow offset animates
  toward 0 on press and springs back on release — this is the app's baseline "everything is
  touchable" feedback, used on literally every button, card, and nav icon.
- **Screen transitions read as turning a page**, not sliding a panel — shared-element/morph
  transitions where it fits (a level node grows into the gameplay card).
- **Lists stagger in**, 40–80ms per item.
- **Ambient motion stays subtle** — background butterflies drifting, a slow idle flutter near
  the nav's Home button.
- **Spend the big motion budget on real payoffs** (word found, level stars, race win, path-hop),
  keep routine navigation quick and quiet by comparison.
- **`prefers-reduced-motion`** swaps everything to simple opacity fades, no exceptions.
- **Performance:** transform/opacity only, cap simultaneous particles (~12), `will-change`
  sparingly.

## 7. Global chrome — present on (almost) every page

### 7.1 The floating nav
A single pill-shaped bar, floating ~16px above the bottom safe area (never flush to the screen
edge — it should look like it's resting on the page, per Rule 2's sticker shadow), `--surface`
fill, `--ink` border. **This is the direct fix for "I can't get back to home"** — it's persistent
chrome, not a per-screen decision.

**Contents, left to right:**
1. **Daily** — small flame/streak-count badge, links to `/daily`
2. **Level Path** — links to `/level-path`
3. **Home** — the one blob-shaped icon (Rule 5), visually raised slightly above the rest of the
   pill like a dock icon popping out, largest tap target in the bar, links to `/`
4. **Race** — links to `/play/race/lobby`
5. **Account** — your avatar. Signed in: your Google photo in a doodle circular frame. Guest:
   an empty outlined-avatar doodle. **Tapping it is the sign-in entry point** — opens `/sign-in`
   directly. This is also the direct fix for "there's no way to sign in": it's not a hidden
   forced-onboarding step anymore, it's a permanent, obvious button.

Settings and the Butterfly Collection live inside the Profile screen (reached via Account) rather
than getting their own nav slots — five icons is the ceiling for a bar this size before it stops
being scannable at a glance.

**States:**
- **Full bar** on Home, Level Map, Level Info sheet, Standard Setup, Race Lobby, Race Ready-Up,
  Race Results, Settings, Profile, Daily Challenge.
- **Collapsed — same component, not a separate pause icon — during active, timed Level and
  Race gameplay.** This is a hard requirement, not a style preference: gameplay must not fall
  back to a bespoke standalone pause button. It's the *same* `FloatingNav`, in a small
  collapsed-pill state (e.g. one compact icon), that expands on tap to reveal the normal Home /
  Level Path / Race / Account items **plus quick access to the audio mixer** — so a player can
  reach Home, Profile, or adjust ambience mid-puzzle without a second, unfamiliar UI. Tapping
  Home from the collapsed/expanded state during gameplay opens a confirm sheet ("Leave this
  puzzle? Your current attempt won't be saved" / "Leave the race? This forfeits the round")
  before navigating — keeps "always reachable" true without an accidental tap costing a race.
- **Hidden entirely** only on Splash and `/sign-in` — you're not "in the journal" yet.
- **Tablet/landscape:** the pill relocates to a floating vertical bar on the left edge, same five
  items top-to-bottom, Home still the largest/raised element. The collapse/expand transition
  must use the same shared spring (§6) on every device — a stuttering or jerky expand animation
  on any device is a bug, not acceptable "good enough."
- **The collapsed state is always a real icon, never a text label.** A wide text pill standing
  in for the icon (seen on phone in testing) is a fallback/placeholder state, not shippable UI.

### 7.2 The signature footer
A small handwritten (Caveat) line at the natural end of a page's content — *"a little garden,
made by kimzam 🌿"* — `--ink` at ~60% opacity, centered, rotated −2° (Rule 6). This is a true
footer (part of scrollable content), not sticky chrome like the nav — on short-content screens
with no natural scroll end (Sign-in, Race Ready-Up) it sits statically pinned above the safe
area. Always leave bottom padding equal to the floating nav's height + margin so the footer never
sits underneath it. **Hidden during active gameplay** (Level/Standard/Race play) to keep that
screen focused — it reappears on pause and results.

### 7.3 Content width — applies to tablet, not just desktop
Confirmed via live device testing: tablet landscape (e.g. a 10–11" tablet) was showing large
dead gutters on both sides because content wasn't width-capped. The centered-column treatment
from §11.2 (originally written for 1920px desktop) applies starting at tablet landscape widths,
not only at desktop breakpoints — don't let full-bleed-stretched-to-edge be the default for any
viewport wider than a phone.

## 8. Sitemap — the explicit routing map
This exists specifically to kill "the flow and routing is a mess." Every reachable screen and
exactly where it links from:

```
/                         Home            ← default landing, guest by default, no forced gate
/sign-in                  Sign-in         ← reached only via the nav's Account avatar
/daily                    Daily Challenge ← from Home's daily card, or nav
/level-path               Level Map       ← from Home or nav
/level-path/[levelId]     Level gameplay  ← from tapping a node → Level Info sheet → Play
/play/standard/[diff]     Standard setup → gameplay ← from Home's "Standard" link or nav shortcut
/play/race/lobby          Race lobby      ← from Home or nav
/play/race/[code]/ready   Race ready-up   ← after room create/join
/play/race/[code]         Race gameplay   ← after both players ready
/play/race/[code]/results Race results    ← after timer ends
/profile                  Profile/Collection (+ Settings tab) ← from nav Account (signed in)
/settings                 Settings        ← reachable from /profile, and directly via deep link
```
No screen is reachable only through a dead-end or a placeholder link — every arrow above is a
real link/route. Locked Level Path nodes are non-interactive elements, not links to anywhere
(see `agents.md` §5).

**On guest vs. signed-in access, explicitly:** guest access to gameplay was always the intended
design (`plan.md` §5) — that part doesn't change. What was actually broken was that there was no
visible way to *choose* to sign in. The Account avatar in the floating nav is that fix: always
present, always tappable, obvious at a glance whether you're signed in or not.

## 9. Screens — full walkthrough
Each entry: purpose, layout, key interaction, nav/footer state, motion notes. Shape/shadow/icon
rules from §4 apply throughout and aren't re-explained per screen.

### 9.1 Splash
Cold-start brand moment. Centered Fredoka wordmark on the paper-grain `--bg`; doodle butterflies
drift in and settle. Opens "like a book" into Home. No nav/footer. ≤1.5s on true cold start, near
-instant on quick re-opens.

### 9.2 Home
1. Header: Account avatar (guest or signed-in state) top-right — the same element as the nav's
   rightmost icon, so it's recognizable immediately.
2. **Daily Challenge card** — today's theme, streak badge, "Play Today's Puzzle."
3. **Level Path teaser** — current chapter/level, mini path preview, "Continue."
4. Two primary actions: **Level Path**, **Race a Friend**; "Standard (Free Play)" as a smaller
   tertiary link beneath.
5. Small stats row: words found, races won vs. partner, current streak.
Full nav, footer visible at natural scroll end. Cards stagger in 60–80ms apart on load.

### 9.3 Sign-in
Reached only via the nav's Account avatar (§7.1/§8) — never a forced first-run gate. Warm doodle
illustration (two butterflies meeting), one line of copy, primary "Sign in with Google" (uneven-
rectangle button, not a blob — it carries text), secondary "Continue as guest" text link. Loading
and error states are simple, low-stakes (retry, no alarming red banner). No nav bar here
(you're mid-decision about identity); footer pinned statically. Successful sign-in triggers a
garland-burst transition back to Home.

### 9.4 Level Map
Vertical winding garden path, scrollable. Level nodes as flower/leaf stops; completed nodes show
0–3 stars; locked nodes are greyed non-interactive elements with a closed-bud icon (never a link,
per §8); current/next node pulses. Chapter banners (Garden → Rainy Day → Cozy Cottage → Night
Sky → Date Night) shift the background tint subtly per zone. A doodle player-marker sits on your
current node and **hops forward** with a spring animation on level completion — the signature
motion of this screen. Full nav; auto-scrolls to center your current level on entry.

### 9.5 Level Info (bottom sheet)
Level number + chapter theme, star-requirement hints, difficulty badge, primary Play button
(uneven-rectangle, text-bearing), small close. Sheet slides up with spring physics; backdrop
blurs. Nav stays visible but dimmed behind the sheet.

### 9.6 Gameplay — Level & Standard (shared component)
Top bar: the collapsed `FloatingNav` (§7.1 — same component, not a separate icon) + level/theme label +
optional timer. Garland strip pinned under the top bar. Grid card centered (uneven radius,
sticker-shadow border per §4); word-list pills below on phone portrait, beside on tablet. Drag/
tap letter selection with a chunky rounded highlight; a found word gets a hand-drawn wobbly
circle plus its butterfly launches into the garland. **No fail state in Level mode** — stars
measure quality, not gatekeeping. Level-complete overlay animates stars in one at a time. Footer
hidden during play, reappears on the pause/complete overlays.

### 9.7 Standard (Free Play) Setup
Swipeable theme carousel (card-tilt on swipe), three-card difficulty picker, optional timer
toggle (off by default), Start button. Full nav + footer.

### 9.8 Race Lobby — Create/Join
Segmented control. Create: large shareable room code, native-share button, QR code, then a
"waiting for your partner…" state with two doodle butterflies circling each other until they
"meet" with a sparkle on connect. Join: big chunky code-entry boxes. Full nav + footer.

### 9.9 Race Ready-Up
Both players' avatars/names side by side; each edits only their own difficulty; a Ready toggle
per player; synced 3-2-1-GO countdown in large Fredoka numerals once both are ready, sweeping
into gameplay on "GO." Full nav (you haven't started yet) + footer pinned.

### 9.10 Race Gameplay (with banter chat)
Nav collapsed to its small pill (§7.1, same component) — same forfeit-confirmation reasoning as Level
gameplay. Shared countdown timer, big, top-center. Your grid + word list is the primary focus;
partner's *live progress* shows as a slim strip — their garland count and a percentage-filled
grid outline, never their actual letters. Both garlands visible at the top, growing
independently. A floating chat-bubble button (thumb corner) opens a tray of one-tap banter
presets ("GG!", 😤, "So close!", "Nice find!", 🦋, "Hurry up!") — as real SVG/emoji-safe presets
sent instantly, appearing as a small speech-bubble doodle near the sender's garland before
fading. No keyboard mid-race. Final ~10 seconds: timer pulses gently in `--accent`/`--gold`,
tasteful not anxious. Footer hidden.

### 9.11 Race Results
Full nav returns. Winner banner in big Fredoka ("You found more! 🦋" — as a real doodle butterfly
graphic, not the literal emoji glyph, despite how that reads in this doc). Both full garlands
side by side, stats, the same banter chips plus a freeform text box now that there's no time
pressure, Rematch / Change Difficulty / Home. Winner's garland gets a shimmer pass; a capped
(~12) fall of hand-drawn petal/butterfly confetti. Footer returns.

### 9.12 Settings
Reached from Profile or directly via `/settings`. Sections: **Appearance** (Light/Dark/System),
**Sound Mixer** (four doodle sliders — cassette/Lofi, cloud-drip/Rain, leaf-swirl/Wind, small-
bird/Birds — each 0–100%, freely mixable, master volume above, 2–3 tappable presets, one
explicit "▶ Start ambience" tap for the first playback), **Account** (profile card, Sign out,
Delete my data — or a "Sign in with Google" prompt + claim-progress flow if in guest mode),
**About** (sound attributions, version). Sections expand with a height-spring. Full nav + footer.

### 9.13 Profile / Butterfly Collection
Grid of collected butterfly doodles (sticker-album feel); uncollected slots are soft
silhouettes; tapping a collected one shows when/where it was earned. Core stats above the grid:
levels completed, total words found, race record vs. partner, current streak, longest streak.
Newly-collected butterflies carry a small rotated "new" sparkle badge that clears on tap. Full
nav + footer.

### 9.14 Daily Challenge
Reuses the Gameplay component (§9.6) with a Daily-specific header: today's date (Caveat,
small), streak count, a mini calendar strip of the last 7 days' completion dots. If already
completed today: a "come back tomorrow" state showing today's result instead of a fresh grid.
Full nav on the intro/result states; minimized during active play, same as §9.6.

## 10. Accessibility & responsiveness
- Minimum touch target 44×44px for all interactive elements, including every floating-nav icon.
- Both palettes checked for AA text contrast; the sticker-shadow border (Rule 2) doubles as a
  contrast aid against busy paper-grain backgrounds.
- Found-word indication never relies on color alone.
- Portrait and landscape supported on phone and tablet; the floating nav relocates per §7.1.
- Content padding always accounts for the floating nav's height so nothing sits underneath it,
  on every screen where it's present.
- `prefers-reduced-motion` honored everywhere per §6.

## 11. Round 4 additions (post-README/video audit)

**11.1 No native browser dialogs, ever.** The nav's "leave puzzle/race" confirmation must be a
custom Framer Motion sheet matching §4's shape/shadow language — never `window.confirm()`,
`alert()`, or `prompt()`. A native dialog breaks the hand-drawn illusion completely regardless
of how correct the logic behind it is.

**11.2 Desktop breakpoint (1920×1080 and similar large screens).** Previously mobile/tablet-only;
now add a third breakpoint: content caps at a centered ~1000px column (never full-bleed edge to
edge — a flat-out-stretched pink background at 1920px reads empty, not calm). The floating nav
docks as the tablet's left-rail treatment. Race Gameplay specifically gets a desktop-only
enhancement: show both players' **full** grids side by side (not the phone's partner-progress
mini-strip) since the width supports it.

**11.3 Level Path scale: ~365 levels across 10–12 seasonal/monthly chapters.** Word pools are
NOT hand-curated per level — build a shared pool per chapter (Datamuse-bootstrapped per
`plan.md` §8) and algorithmically assign leveled subsets with a difficulty ramp. The Level Map
must virtualize/window its node list (only render nodes near the viewport) at this scale —
rendering 365 nodes unvirtualized will visibly lag on scroll.

**11.4 Butterfly Collection personalization.** Add, in this priority order: (1) chapter-exclusive
butterfly species — a chapter's butterfly design is earned nowhere else, (2) Daily Challenge
butterflies carry that day's date, so the collection reads as a diary, (3) a rare **"Together"**
butterfly awarded only when both accounts complete the same calendar day's Daily Challenge —
this is the one actually built for two people, prioritize it if only implementing one.

**11.5 Sound Mixer gets a 6th channel: Thunder.** Independent slider alongside Master/Lofi/Rain/
Wind/Birds — sparse, occasional rumble, not a constant loop. Not merged into Rain; the whole
premise of the mixer is independent mix-and-match.

**11.6 Username system.** Google sign-in defaults to the Google account's display name, editable
after in Settings. Guest mode prompts for a display name on first entry (stored locally),
editable in Settings the same way. Every place a player currently shows as generic ("Player 1,"
"Player 2," an unlabeled avatar) — race lobby, ready-up, gameplay partner strip, chat, results —
must show the real name instead.

**11.7 Grid selection highlight — must be visibly animated, not just present.** The highlight
path should draw progressively as a finger/cursor moves across cells (chunky rounded stroke,
`--accent`), not only appear after the drag completes. This was reported broken/invisible —
treat "renders nothing during an active drag" as the default assumption to disprove, not a
possibility to rule out by reading code.

**11.8 "Standard (Free Play)" is renamed to "Free Play"** everywhere it appears in UI copy.
