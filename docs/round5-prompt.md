# Prompt for Antigravity CLI — Round 5: Fix What Live Testing Actually Found

Copy everything below the line into `agy`. This supersedes round4-prompt.md's priority order —
work through P0 and P1 here first; round4's Tier 2/3 items (username system, 365 levels, etc.)
still apply, but only after everything below is a confirmed, tested pass.

---

## Read this first: three README claims are confirmed false

Live two-device testing (a real phone + a real tablet, not just code review) disproved three
specific claims your own `README.md` makes:

1. **"Auto-Kick Teardown"** does not work — the non-leader player gets stuck in an orphaned room
   when the leader leaves, instead of being redirected.
2. **The countdown is not shared** — the leader sees a 3-2-1-GO countdown; the other player is
   dropped straight onto the live grid with no countdown, getting a head start. This makes the
   core "race" premise of the mode unfair as currently built.
3. **13×13 (Hard) grids do not "scale down gracefully"** — they broke completely on both a
   phone and a tablet in live testing.

Treat any other README claim about multiplayer/gameplay correctness the same way: as an
intended-behavior description to verify, not a confirmed fact. `agents.md` §11's rule about
using Playwright + `/browser` for verification, not code-reading alone, is exactly why this
round exists — the previous round's fixes need to be *tested*, not just trusted.

When testing responsive/device-specific bugs below, use Playwright's device emulation profiles
for an Android phone and an Android tablet, not just a resized desktop browser window — several
of these bugs are viewport-specific and won't reproduce in default desktop Chrome.

---

## P0 — Fix these first; they break the core experience, not just polish it

1. **Sync the race countdown.** Add (or fix) a `countdown_start { startAt }` broadcast event per
   `agents.md` §5 — both clients must render the 3-2-1-GO countdown computed from the same
   shared timestamp. Test: open two contexts, start a race, confirm both screens show the
   countdown and reach 0 at the same time, not one client skipping straight to live gameplay.
2. **Fix horizontal/vertical word-selection.** Confirmed repro: diagonal drag-selection works,
   pure horizontal and pure vertical drags don't register a highlight at all. Check the
   orthogonal-vector branch (`dx=0` or `dy=0`) of whatever validates drag direction in the grid
   interaction logic specifically — the diagonal branch working while orthogonal doesn't points
   at that exact code path. This affects Standard, Level Path, *and* Race (shared component) —
   one fix should resolve all three. Test with an actual horizontal and an actual vertical
   drag-select, not just diagonal, in your Playwright test.
3. **Fix Hard mode (13×13) grid layout** on both phone and tablet viewports — confirmed broken
   on both in live testing despite the README's claim. Test at both viewport sizes specifically,
   not just one.
4. **Fix chat message content being dropped.** Confirmed repro: an incoming banter notification
   shows the sender's name/id (e.g. "GUEST") but not the actual message. Check whatever renders
   the notification — it's reading/displaying the sender field but not the `content` field from
   `chat_message`.
5. **Make `room_closed` (leader-left) actually redirect the other player.** Confirmed repro: the
   non-leader's client stays connected to a dead room instead of returning to lobby/home. If the
   broadcast event already exists, the bug is that the receiving client isn't acting on it —
   verify the handler actually fires and navigates, don't assume it does because the event is
   broadcast.

## P1 — Fix next; significant but not core-breaking

1. **Race Gameplay layout on phone** — confirmed the timer becomes unreadable and the grid
   renders badly broken specifically in Race mode on phone (distinct from the Standard/Level
   grid, which tested fine — Race apparently has its own layout implementation with its own
   bugs). Fix and verify at phone viewport specifically.
2. **Tablet content-width gutters** — per `design.md` §7.3, extend the centered-column treatment
   to tablet landscape, not just 1920px desktop. Confirmed large dead space on both sides on a
   real 10–11" tablet.
3. **Unify the gameplay pause control into the single `FloatingNav` component**, collapsed state,
   per the rewritten `design.md` §7.1 — remove any separate bespoke pause-only icon. The
   collapsed state must be a real icon, never a text label (confirmed a wide text label was
   showing on phone instead of an icon).
4. **Fix the nav's expand/collapse animation** on both phone and tablet — confirmed jerky/
   stuttering on both, described as "really bad" on live devices, not a minor nitpick.
5. **Fix the Level Info sheet's Play button being blocked** by the nav pill overlapping it on
   phone — z-index/layering issue confirmed in live testing.
6. **Word list still requires scrolling** to see all words (horizontal scroll confirmed
   specifically on tablet) — per `design.md` §9.6, grid and word list must both fit without
   scrolling on the target viewport. This was flagged in round 4 too and is still unresolved —
   verify the actual fix this time with a real viewport-height test, not just a code change.
7. **Lofi audio channel is completely silent** while Rain/Wind/Birds all play correctly on the
   same device. Check the Lofi track's file/buffer specifically — this points at that one asset
   or its loading path, not the mixer architecture generally (the other three channels prove the
   `AudioContext`/`GainNode` graph itself works).
8. **Sound Mixer panel layout breaks on tablet width**, cutting off sliders — confirmed the
   container doesn't adapt to the wider viewport. Fix and verify at tablet width specifically.
9. **Medium (10×10) grid breaks at the bottom on tablet** — confirmed tablet-specific, phone was
   fine at this difficulty. Fix and verify at tablet viewport.

## After P0 and P1 are fully green

Continue with round4-prompt.md's Tier 2 and Tier 3 in the order specified there (username
system → chat redesign polish → thunder channel → desktop breakpoint → difficulty placement
rules → then 365 levels → butterfly personalization → keep-alive → free-tier safety → repo
cleanup). Don't restart or duplicate work already covered there.

## Reporting

Same discipline as before: update `REBUILD_CHECKLIST.md`, three-failed-attempts-and-report rule
still applies, don't report anything complete without an actual passing Playwright test or a
`/browser` visual confirmation as evidence.
