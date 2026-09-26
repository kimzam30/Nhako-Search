import { useSyncExternalStore } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/multiplayer/supabase';

/*
 * The signed-in user, held once for the whole app.
 *
 * Every page used to call `supabase.auth.getUser()`, which is a network round
 * trip to the auth server: four of them per tab switch, measured live, each
 * one blocking the queries behind it. `getSession()` reads the token already
 * in localStorage (refreshing it only when it has expired), and row-level
 * security still checks the token on every query, so nothing is trusted that
 * was not before.
 */

let current: User | null = null;
let resolved = false;
let pending: Promise<User | null> | null = null;
const listeners = new Set<() => void>();

function set(user: User | null) {
  const changed = !resolved || current?.id !== user?.id;
  current = user;
  resolved = true;
  if (changed) listeners.forEach(l => l());
}

if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((_event, session) => set(session?.user ?? null));
}

/** The current user, resolved from the local session (no network when fresh). */
export function getCurrentUser(): Promise<User | null> {
  if (resolved) return Promise.resolve(current);
  if (!pending) {
    pending = supabase.auth
      .getSession()
      .then(({ data }) => {
        set(data.session?.user ?? null);
        return current;
      })
      .catch(() => {
        set(null);
        return null;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!resolved) void getCurrentUser();
  return () => listeners.delete(listener);
}

/**
 * `undefined` while the session is still being read (first paint only),
 * then the user or null.
 */
export function useCurrentUser(): User | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (resolved ? current : undefined),
    () => undefined
  );
}

/** Stable cache scope for the current player: their id, or "guest". */
export function scopeOf(user: User | null | undefined): string {
  return user?.id ?? 'guest';
}
