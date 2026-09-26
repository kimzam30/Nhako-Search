import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/multiplayer/supabase';
import { getCurrentUser, scopeOf, useCurrentUser } from '@/lib/auth/session';
import { invalidate, mutate, prefetch, readCache, useQuery } from '@/lib/data/cache';
import { longestRun, resolveStreak } from '@/lib/daily/logic';
import { readJSON } from '@/lib/storage';
import type { CollectionEntry, LevelProgressRow } from '@/lib/types';

/*
 * Everything the lobby screens show about the player, loaded as ONE unit.
 *
 * Home, Daily, Levels and You used to each fetch their own slice on mount:
 * 5-7 sequential requests per tab switch. Signed-in players now make a single
 * RPC (get_player_summary, migration 005) and every screen reads the same
 * cached result, so switching tabs never waits on the network.
 */

export interface PlayerSummary {
  scope: string;
  isGuest: boolean;
  userId: string | null;
  name: string;
  avatar: string;
  friendCode: string | null;
  levels: LevelProgressRow[];
  /** Every game day played, oldest first. */
  dailyDates: string[];
  streak: number;
  playedToday: boolean;
  bestStreak: number;
  raceWins: number;
  races: number;
  collection: CollectionEntry[];
  tokens: number;
  tokensLifetime: number;
  pendingRequests: number;
  friends: number;
}

export const GUEST_WALLET_KEY = 'nhako_wallet';

interface LocalDaily {
  lastDate?: string;
  streak?: number;
  history?: string[];
}
type LocalLevels = Record<string, { stars?: number; best_time_seconds?: number }>;

function guestSummary(): PlayerSummary {
  const levelsRaw = readJSON<LocalLevels>('nhako_levels', {});
  const daily = readJSON<LocalDaily>('nhako_daily', {});
  const days = [...new Set([...(daily.history ?? []), ...(daily.lastDate ? [daily.lastDate] : [])].map(d => String(d).slice(0, 10)))].sort();
  const { streak, playedToday } = daily.lastDate
    ? resolveStreak(String(daily.lastDate).slice(0, 10), daily.streak || 1)
    : { streak: 0, playedToday: false };
  const wallet = readJSON<{ tokens?: number; lifetime?: number }>(GUEST_WALLET_KEY, {});
  let name = 'Guest';
  try {
    name = localStorage.getItem('nhako_guest_name') || 'Guest';
  } catch {
    /* private mode */
  }
  return {
    scope: 'guest',
    isGuest: true,
    userId: null,
    name,
    avatar: '',
    friendCode: null,
    levels: Object.keys(levelsRaw).map(id => ({
      level_id: id,
      stars: levelsRaw[id]?.stars ?? 0,
      best_time_seconds: levelsRaw[id]?.best_time_seconds,
    })),
    dailyDates: days,
    streak,
    playedToday,
    bestStreak: Math.max(longestRun(days), streak),
    raceWins: 0,
    races: 0,
    collection: readJSON<CollectionEntry[]>('nhako_collection', []),
    tokens: Math.max(0, wallet.tokens ?? 0),
    tokensLifetime: Math.max(0, wallet.lifetime ?? 0),
    pendingRequests: 0,
    friends: 0,
  };
}

interface SummaryRow {
  levels: LevelProgressRow[];
  daily: { d: string; s: number }[];
  collection: CollectionEntry[];
  race_wins: number;
  races: number;
  profile: { display_name: string | null; avatar_url: string | null; friend_code: string | null } | null;
  wallet: { tokens: number; lifetime: number } | null;
  pending_requests: number;
  friends: number;
}

async function signedInSummary(user: User): Promise<PlayerSummary> {
  const { data, error } = await supabase.rpc('get_player_summary');
  if (error) throw error;
  const row = data as SummaryRow;
  const daily = row.daily ?? [];
  const dates = daily.map(r => String(r.d).slice(0, 10));
  const last = daily[daily.length - 1];
  const { streak, playedToday } = last ? resolveStreak(String(last.d).slice(0, 10), last.s) : { streak: 0, playedToday: false };
  return {
    scope: user.id,
    isGuest: false,
    userId: user.id,
    name: row.profile?.display_name || (user.user_metadata?.name as string) || 'Player',
    avatar: row.profile?.avatar_url || (user.user_metadata?.avatar_url as string) || '',
    friendCode: row.profile?.friend_code ?? null,
    levels: row.levels ?? [],
    dailyDates: dates,
    streak,
    playedToday,
    bestStreak: Math.max(longestRun(dates), streak, ...daily.map(r => r.s)),
    raceWins: Number(row.race_wins ?? 0),
    races: Number(row.races ?? 0),
    collection: row.collection ?? [],
    tokens: row.wallet?.tokens ?? 0,
    tokensLifetime: row.wallet?.lifetime ?? 0,
    pendingRequests: Number(row.pending_requests ?? 0),
    friends: Number(row.friends ?? 0),
  };
}

export async function fetchSummary(user?: User | null): Promise<PlayerSummary> {
  const u = user === undefined ? await getCurrentUser() : user;
  return u ? signedInSummary(u) : guestSummary();
}

export const summaryKey = (scope: string) => `summary:${scope}`;

/** The player summary for whoever is signed in; cached and shared app-wide. */
export function usePlayer() {
  const user = useCurrentUser();
  const scope = user === undefined ? null : scopeOf(user);
  const q = useQuery<PlayerSummary>(scope ? summaryKey(scope) : null, () => fetchSummary(user ?? null), { persist: true });
  return { user, ...q, summary: q.data };
}

/** Warm the summary (app boot, tab press-in). */
export async function prefetchSummary() {
  const user = await getCurrentUser();
  prefetch(summaryKey(scopeOf(user)), () => fetchSummary(user), true);
}

/** After any write that changes progress: refetch in the background. */
export function refreshSummary() {
  invalidate('summary:');
}

/** Optimistic local edit of the current player's summary. */
export async function patchSummary(update: (s: PlayerSummary) => PlayerSummary) {
  const user = await getCurrentUser();
  mutate<PlayerSummary>(summaryKey(scopeOf(user)), prev => (prev ? update(prev) : prev), true);
}

export async function currentSummary(): Promise<PlayerSummary> {
  const user = await getCurrentUser();
  return readCache<PlayerSummary>(summaryKey(scopeOf(user))) ?? fetchSummary(user);
}
