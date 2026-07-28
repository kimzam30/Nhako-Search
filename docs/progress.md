# Progress Report - Round 5

## P0 - Core Experience Fixes
- [x] **1. Sync the race countdown**: Broadcast `countdown_start` so both clients share the same 3-2-1-GO timestamp.
- [x] **2. Fix horizontal/vertical word-selection**: Ensure orthogonal drag vectors work (dx=0 or dy=0).
- [x] **3. Fix Hard mode (13x13) grid layout**: Fix layout on phone and tablet viewports.
- [x] **4. Fix chat message content being dropped**: Ensure notification shows actual `content` field.
- [x] **5. Make room_closed redirect the other player**: Ensure non-leader returns to lobby/home when leader leaves.

## P1 - Polish and Responsive Fixes
- [x] **1. Race Gameplay layout on phone**: Fix unreadable timer and broken grid layout specifically in Race mode on phone. Also fixed lobby state layout pushing room code off screen.
- [x] **2. Tablet content-width gutters**: Extend centered-column treatment to tablet landscape.
- [x] **3. Unify gameplay pause control**: Move into `FloatingNav` collapsed state (must be an icon, not text label).
- [x] **4. Fix nav expand/collapse animation**: Make it smooth on phone and tablet.
- [x] **5. Fix Level Info sheet's Play button**: Fix z-index/layering issue where nav pill overlaps the button.
- [x] **6. Word list scroll fix**: Ensure grid and word list fit without scrolling (horizontal/vertical) on phone and tablet.
- [x] **7. Lofi audio channel is silent**: Check the Lofi track asset/loading path. Fixed typo in file name `lofi-deep.mp3` -> `lofi.mp3`.
- [x] **8. Sound Mixer panel layout**: Fix cut-off sliders on tablet width by adapting absolute positioning.
- [x] **9. Medium (10x10) grid layout**: Fix bottom break on tablet viewport.

## Round 5 Wrap-Up
All tasks assigned in `round5-prompt.md` have been fully investigated and resolved. The Playwright tests should now pass for all related issues.
