'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CloseSvg, VolumeSvg } from '@/components/ui/Icons';
import { Sheet, afterSheetClosed } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { MixerPanel } from '@/components/sound/MixerPanel';
import { gameplayParent } from '@/lib/nav/routes';
import { useGameTitle } from '@/lib/nav/gameTitle';
import { useLeaveGuardArmed } from '@/lib/nav/leaveGuard';

/** Distinct routes seen this session; >1 means there is in-app history to go back to. */
let routesSeen = 0;

/** History-state key marking the same-URL entry that catches Back mid-game. */
const GUARD_KEY = '__nhakoGuard';
const isGuard = () => Boolean(window.history.state?.[GUARD_KEY]);

/*
 * The immersive gameplay header: Close on the left, Sound on the right, and
 * nothing else competing with the board.
 *
 * Close asks first because leaving loses the attempt. It then goes BACK when
 * the player arrived from inside the app (so the level map keeps its scroll
 * position), or replaces to the parent screen after a deep link, so Back can
 * never land on a stale finished game.
 *
 * While a page has armed the leave guard (something to lose), Back asks the
 * same question: the bar pushes one same-URL entry, and when Back pops it the
 * entry goes straight back and the Leave sheet opens. Once the board is won
 * the guard disarms and removes its entry, so Back never needs two presses.
 */
export function GameBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mixerOpen, setMixerOpen] = useState(false);
  const lastPath = useRef<string | null>(null);
  const title = useGameTitle();
  const armed = useLeaveGuardArmed();
  /** Set while Leave is navigating away, so the guard lets it through. */
  const leavingRef = useRef(false);

  useEffect(() => {
    if (pathname && pathname !== lastPath.current) {
      lastPath.current = pathname;
      leavingRef.current = false;
      routesSeen++;
    }
  }, [pathname]);

  useEffect(() => {
    if (!armed) return;
    if (!isGuard()) window.history.pushState({ ...window.history.state, [GUARD_KEY]: true }, '');
    const onPop = () => {
      // Still on (or back to) the guard entry: a sheet above it closed.
      if (leavingRef.current || isGuard()) return;
      window.history.pushState({ ...window.history.state, [GUARD_KEY]: true }, '');
      setConfirmOpen(true);
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // Disarmed in place (the board was won): drop the now-pointless entry.
      if (!leavingRef.current && isGuard()) window.history.back();
    };
  }, [armed]);

  const parent = gameplayParent(pathname);
  if (!parent) return null;

  const leave = () => {
    leavingRef.current = true;
    setConfirmOpen(false);
    afterSheetClosed(() => {
      const guarded = isGuard();
      if (routesSeen > 1) {
        // Past the guard entry too, back to the screen the game came from.
        if (guarded) window.history.go(-2);
        else router.back();
      } else if (guarded) {
        window.addEventListener('popstate', () => setTimeout(() => router.replace(parent), 0), { once: true });
        window.history.back();
      } else {
        router.replace(parent);
      }
    });
  };

  return (
    <>
      <header
        data-game-bar
        className="sticky top-0 z-30 w-full bg-background/90 backdrop-blur-sm"
        style={{ paddingTop: 'var(--safe-top)' }}
      >
        <div className="flex items-center justify-between h-14 short:h-11 px-2 max-w-5xl mx-auto">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label="Leave game"
            className="press flex items-center justify-center w-12 h-12 rounded-full text-ink [@media(hover:hover)]:hover:bg-surface"
          >
            <CloseSvg className="w-6 h-6" />
          </button>
          {title ? (
            <h1 className="flex-1 min-w-0 text-center font-display text-lg text-ink truncate px-2">{title}</h1>
          ) : (
            <span className="flex-1" />
          )}
          <button
            type="button"
            onClick={() => setMixerOpen(true)}
            aria-label="Sound"
            aria-haspopup="dialog"
            className="press flex items-center justify-center w-12 h-12 rounded-full text-ink [@media(hover:hover)]:hover:bg-surface"
          >
            <VolumeSvg className="w-6 h-6" />
          </button>
        </div>
      </header>

      <Sheet open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Leave this game?">
        <p className="font-body text-ink-2 font-bold mb-6">Your current attempt won&rsquo;t be saved.</p>
        <div className="flex flex-col gap-3">
          <Button variant="danger" fullWidth onClick={leave}>
            Leave
          </Button>
          <Button variant="secondary" fullWidth onClick={() => setConfirmOpen(false)}>
            Keep playing
          </Button>
        </div>
      </Sheet>

      <Sheet open={mixerOpen} onClose={() => setMixerOpen(false)} title="Sound">
        <MixerPanel compact />
      </Sheet>
    </>
  );
}
