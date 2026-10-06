import { useEffect, useSyncExternalStore } from 'react';

/*
 * "A game is in progress and leaving would lose it."
 *
 * The game bar's Close button already asks before leaving, but Back (browser
 * button, iOS edge swipe, Android back) used to drop the board without a
 * word. Pages arm this while there is something to lose (a word found, a race
 * running); the layout-level game bar reads it and turns Back into the same
 * "Leave this game?" question. A tiny external store, like gameTitle, so the
 * bar does not import page state.
 */
const holders = new Set<symbol>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLeaveGuardArmed(): boolean {
  return useSyncExternalStore(subscribe, () => holders.size > 0, () => false);
}

/** Asks before Back leaves the page while `armed` is true. */
export function useArmLeaveGuard(armed: boolean) {
  useEffect(() => {
    if (!armed) return;
    const id = Symbol('leave-guard');
    holders.add(id);
    emit();
    return () => {
      holders.delete(id);
      emit();
    };
  }, [armed]);
}
