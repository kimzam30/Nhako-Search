import { useEffect, useSyncExternalStore } from 'react';

/*
 * The title shown in the immersive game bar.
 *
 * Gameplay pages used to render their own heading row under the bar, which on
 * a 375x667 phone pushed the word list below the fold. The page now hands its
 * title to the bar instead. A tiny external store rather than context, so the
 * layout-level bar does not import any page data (the level word lists).
 */
let current = '';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGameTitle(): string {
  return useSyncExternalStore(subscribe, () => current, () => '');
}

/** Sets the game bar title while the calling page is mounted. */
export function useSetGameTitle(title: string) {
  useEffect(() => {
    current = title;
    listeners.forEach(l => l());
    return () => {
      if (current === title) {
        current = '';
        listeners.forEach(l => l());
      }
    };
  }, [title]);
}
