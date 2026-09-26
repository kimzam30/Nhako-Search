import { supabase } from '@/lib/multiplayer/supabase';
import { getCurrentUser } from '@/lib/auth/session';
import { currentSummary, GUEST_WALLET_KEY, patchSummary, refreshSummary } from '@/lib/data/player';
import { readJSON, writeJSON } from '@/lib/storage';

/*
 * Token balance. Optimistic: the HUD updates on the same frame, the server
 * catches up behind it, and a refused change (e.g. spent on another device
 * meanwhile) rolls back by refetching.
 *
 * Signed-in balances only move through the adjust_tokens RPC, which bounds each
 * change and refuses to go negative (migration 005).
 */

const MAX_DELTA = 250;

async function adjustLocal(delta: number): Promise<boolean> {
  const w = readJSON<{ tokens?: number; lifetime?: number }>(GUEST_WALLET_KEY, {});
  const tokens = Math.max(0, w.tokens ?? 0);
  if (tokens + delta < 0) return false;
  writeJSON(GUEST_WALLET_KEY, { tokens: tokens + delta, lifetime: Math.max(0, w.lifetime ?? 0) + Math.max(delta, 0) });
  return true;
}

async function adjustRemote(delta: number): Promise<boolean> {
  let left = delta;
  while (left !== 0) {
    const step = Math.max(-50, Math.min(MAX_DELTA, left));
    const { error } = await supabase.rpc('adjust_tokens', { delta: step });
    if (error) return false;
    left -= step;
  }
  return true;
}

async function adjust(delta: number): Promise<boolean> {
  if (delta === 0) return true;
  const user = await getCurrentUser();
  await patchSummary(s => ({
    ...s,
    tokens: s.tokens + delta,
    tokensLifetime: s.tokensLifetime + Math.max(delta, 0),
  }));
  const ok = user ? await adjustRemote(delta) : await adjustLocal(delta);
  if (!ok || user) refreshSummary();
  return ok;
}

export function earnTokens(amount: number): Promise<boolean> {
  return adjust(Math.max(0, Math.round(amount)));
}

/** Returns false (and changes nothing) when the balance is too low. */
export async function spendTokens(amount: number): Promise<boolean> {
  const s = await currentSummary();
  if (s.tokens < amount) return false;
  return adjust(-Math.abs(Math.round(amount)));
}

/** Moves a guest's local balance into the account on sign-in. True if moved. */
export async function mergeGuestWallet(): Promise<boolean> {
  const w = readJSON<{ tokens?: number }>(GUEST_WALLET_KEY, {});
  const tokens = Math.max(0, w.tokens ?? 0);
  if (!tokens || !(await getCurrentUser())) return false;
  const ok = await adjustRemote(tokens);
  if (ok) {
    try {
      localStorage.removeItem(GUEST_WALLET_KEY);
    } catch {
      /* private mode */
    }
  }
  return ok;
}
