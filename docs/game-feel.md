# game-feel.md — the "feels like a real game" pass (2026-09-26)

Kim's brief: new graphics, motion, transitions and audio so NhakoSearch feels
like a game; keep the doodle theme and the Fredoka / Nunito / Caveat fonts (no
pixel font); borrow the NeraOS / Nhako Tools theme; butterflies across the
screen that never get in the way of play; a new grid; a tighter layout with no
dead whitespace, especially Home. Run through ui-ux-pro-max and the appllama
design skill, and benchmark against shipping games.

## 1. Benchmark: where NhakoSearch sat vs. shipping puzzle games

Reference set: Word Search Pro / Word Search Explorer (PeopleFun), Wordscapes,
Words of Wonders, Royal Match, Candy Crush, Duolingo (for the lobby/streak
loop).

| Surface | What shipping games do | NhakoSearch before | Now |
|---|---|---|---|
| Home / lobby | Top HUD (avatar+level, streak/currency pills, settings). One dominant **Play Level N** button over an illustrated scene. Secondary modes as a row of chunky tiles. Fills the screen; nothing to scroll. | Stack of equal-weight cards; no hero; a dead band under the stats; the next level buried in card 2. | HUD strip, illustrated chapter **stage** with the level number as the hero and a single giant Play button, a 2x2 mode grid (Daily w/ reset countdown, Race, Free Play, Collection). Fits 375x667 without scrolling. |
| Board | Framed board, plain letters, **solid coloured capsules, a different colour per word**, letters pop as the finger passes, capsule follows the finger. | Faint 40% strokes, same green for every found word, no per-letter feedback. | Notebook-paper board with washi-tape corners, 8-colour capsule palette with inked outline, letters pop + turn dark on the capsule, rising pitch per letter. |
| Word bank | Tray of chips; found chips take the word's colour and a check. | Loose centred text that wrapped under the board and trailed off. | Chip tray in a card, found chip filled in its capsule colour with a strike + tick. |
| Boosters | Bottom bar: hint booster with a count badge, timer pill. | Small "Hint" button next to the clock at the top. | Bottom booster bar: timer pill left, hint booster right with a badge. |
| Found feedback | Chime, combo callouts ("Great!", "Amazing!"), particle burst, an object flies to the progress meter. | Two-tone beep. | Chime pitched by combo, combo callout, petal burst, a butterfly flies from the word to its garland slot. |
| Level start | "Level 12" intro card for ~1s. | Board just appears. | NeraOS stepped window intro card (chapter, level, word count). |
| Win | Ribbon banner, stars pop one by one with a note each, confetti, big Continue. | Sheet with stars. | Ribbon banner, star-by-star pops with rising notes, NeraOS petal fall, striped boot-bar sweep, big Continue. |
| Audio | Button clicks, selection ticks, whoosh, fanfare. | found/miss/hint/win only. | + tap, select (per-letter scale), combo, star, whoosh, pop, unlock. All synthesised (0 KB). |
| Transitions | Quick scale/fade between screens, never a slide between tabs. | Hard cuts. | 180 ms rise+fade route template; reduced motion → fade only. |

## 2. What was taken from NeraOS / Nhako Tools

From `Nhako-tools/src/styles/nera.css` (itself from github.com/kimzam30/NeraOS):

- **Lavender** as the second brand hue next to the pink (`--lav`, `--lav-soft`).
- The **hard offset shadow** (already our sticker shadow — kept at 4x5 ink).
- **Stepped window open** (`steps(3)`), used for the level intro card and the
  win dialog.
- The **striped pink/lavender boot bar**, used for every progress bar.
- **pop** and **shake** keyframes, used for stars and misses.
- The **petal fall** finale, used for wins.
- The **butterfly sky**: a random-walk flight with a sine bob and wing flap,
  ported to React, drawn as our hand-drawn doodle butterfly instead of a pixel
  sprite, and restricted so it never interrupts play (§3).

What was NOT taken: Silkscreen/pixel font, `image-rendering: pixelated`,
square corners, SF system font. The doodle radii and Fredoka stay.

## 3. Butterfly sky rules

- One `ButterflySky` in the root layout, so the flock persists across route
  changes instead of re-scattering.
- Always behind content (`z-index: 0`, content above), `pointer-events: none`,
  `aria-hidden`.
- **Gameplay routes:** the flock thins to 3, drops to 35% opacity, and is
  repelled from the board's rectangle — they fly around it, never across it.
- Paused while the tab is hidden; absent under `prefers-reduced-motion`.

## 4. Tokens added

`--lav`, `--lav-soft`, `--tile`, `--board-line`, `--word-1..8` (capsule
palette; each clears 4.5:1 with `--on-accent` letters on top), `--stripes`.
