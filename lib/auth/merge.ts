import { supabase } from '@/lib/multiplayer/supabase';
import type { CollectionEntry } from '@/lib/types';
import { readJSON } from '@/lib/storage';

type LocalLevels = Record<string, { stars?: number; best_time_seconds?: number }>;
interface LocalDaily {
  lastDate?: string;
  streak?: number;
  history?: string[];
}

let inFlight: Promise<void> | null = null;

/**
 * Moves guest progress on this device into the signed-in account.
 *
 * Three problems with the previous version:
 *  - it upserted the guest's stars and times straight over the account's, so
 *    a 3-star level replayed as a guest for 1 star came back as 1 star;
 *  - it never checked the upsert results (supabase-js returns errors, it does
 *    not throw), yet still deleted the local copy — a failed request lost the
 *    progress for good;
 *  - a permanent `nhako_merged` flag meant a later guest session on the same
 *    device was never merged at all.
 * Local data is now removed only after every write has succeeded, and it is
 * the presence of local data, not a flag, that decides whether to merge.
 */
export function mergeGuestProgress(): Promise<void> {
  // The layout's auth listener and its mount check can both fire at sign-in.
  if (!inFlight) inFlight = runMerge().finally(() => (inFlight = null));
  return inFlight;
}

async function runMerge() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('nhako_merged'); // retired flag
  } catch {
    /* private mode */
  }

  const localLevels = readJSON<LocalLevels>('nhako_levels', {});
  const localCollection = readJSON<CollectionEntry[]>('nhako_collection', []);
  const localDaily = readJSON<LocalDaily>('nhako_daily', {});
  const levelIds = Object.keys(localLevels);
  if (levelIds.length === 0 && localCollection.length === 0 && !localDaily.lastDate) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  let ok = true;

  // 1. Levels: keep the better of the two results.
  if (levelIds.length > 0) {
    const { data: existing, error: readError } = await supabase
      .from('level_progress')
      .select('level_id, stars, best_time_seconds')
      .eq('user_id', user.id)
      .in('level_id', levelIds);
    if (readError) {
      ok = false;
    } else {
      const server = new Map((existing ?? []).map(r => [r.level_id as string, r]));
      const rows = levelIds.map(level_id => {
        const local = localLevels[level_id] ?? {};
        const remote = server.get(level_id);
        const times = [local.best_time_seconds, remote?.best_time_seconds].filter(
          (t): t is number => typeof t === 'number'
        );
        return {
          user_id: user.id,
          level_id,
          stars: Math.max(local.stars ?? 0, remote?.stars ?? 0),
          best_time_seconds: times.length ? Math.min(...times) : null,
        };
      });
      const { error } = await supabase.from('level_progress').upsert(rows, { onConflict: 'user_id,level_id' });
      if (error) ok = false;
    }
  }

  // 2. Butterflies: the unique index decides what is already there. Collapse
  // duplicates within the batch — a statement must not present one key twice.
  if (localCollection.length > 0) {
    const byStyle = new Map(
      localCollection
        .filter(c => c && typeof c.butterfly_style_id === 'string')
        .map(c => [
          c.butterfly_style_id,
          {
            user_id: user.id,
            butterfly_style_id: c.butterfly_style_id,
            earned_from: c.earned_from,
            earned_at: c.earned_at,
          },
        ])
    );
    const { error } = await supabase
      .from('butterfly_collection')
      .upsert([...byStyle.values()], { onConflict: 'user_id,butterfly_style_id', ignoreDuplicates: true });
    if (error) ok = false;
  }

  // 3. Daily log: add the guest's days, never overwrite a day the account has.
  const days = [...new Set([...(localDaily.history ?? []), localDaily.lastDate].filter(Boolean) as string[])];
  if (days.length > 0) {
    const { error } = await supabase.from('daily_challenge_log').upsert(
      days.map(d => ({
        user_id: user.id,
        challenge_date: d.slice(0, 10),
        streak_count: d === localDaily.lastDate ? localDaily.streak || 1 : 1,
      })),
      { onConflict: 'user_id,challenge_date', ignoreDuplicates: true }
    );
    if (error) ok = false;
  }

  if (!ok) {
    // Keep the local copy; the next sign-in or page load retries.
    console.error('Merge progress: some rows failed, local progress kept for a retry.');
    return;
  }

  try {
    localStorage.removeItem('nhako_levels');
    localStorage.removeItem('nhako_collection');
    localStorage.removeItem('nhako_daily');
  } catch {
    /* private mode */
  }
}
