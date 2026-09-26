import { getCurrentUser } from '@/lib/auth/session';
import { supabase } from '@/lib/multiplayer/supabase';
import type { LevelProgressRow } from '@/lib/types';
import { readJSON, writeJSON } from '@/lib/storage';

type LocalLevels = Record<string, { stars?: number; best_time_seconds?: number }>;

export async function saveLevelProgress(levelId: string, stars: number, timeSeconds: number) {
  const authUser = await getCurrentUser();

  if (authUser) {
    // Keep the best result. The old code upserted the latest values straight in,
    // so replaying a 3-star level slowly demoted it to 1 star and overwrote the
    // best time — while the guest path below correctly kept the maximum.
    const { data: existingProgress } = await supabase
      .from('level_progress')
      .select('stars, best_time_seconds')
      .eq('user_id', authUser.id)
      .eq('level_id', levelId)
      .maybeSingle();

    const bestStars = Math.max(existingProgress?.stars ?? 0, stars);
    const bestTime =
      existingProgress?.best_time_seconds != null
        ? Math.min(existingProgress.best_time_seconds, timeSeconds)
        : timeSeconds;

    const { error } = await supabase
      .from('level_progress')
      .upsert(
        { user_id: authUser.id, level_id: levelId, stars: bestStars, best_time_seconds: bestTime },
        { onConflict: 'user_id,level_id' }
      );
    if (error) console.error('Save level error:', error);
    // Levels no longer award a butterfly each: 360 identical butterflies made
    // the album meaningless. Chapters award a species instead (achievements).
  } else {
    // Fallback to local storage for guest
    const saved = readJSON<LocalLevels>('nhako_levels', {});
    const prevTime = saved[levelId]?.best_time_seconds;
    saved[levelId] = {
      stars: Math.max(saved[levelId]?.stars || 0, stars),
      best_time_seconds: typeof prevTime === 'number' ? Math.min(prevTime, timeSeconds) : timeSeconds,
    };
    writeJSON('nhako_levels', saved);
  }
}

export async function loadLevelProgress(): Promise<LevelProgressRow[]> {
  const authUser = await getCurrentUser();
  if (authUser) {
    const { data, error } = await supabase.from('level_progress').select('*');
    if (error) console.error('Load levels error:', error);
    return data || [];
  } else {
    const saved = readJSON<LocalLevels>('nhako_levels', {});
    return Object.keys(saved).map(id => ({ level_id: id, stars: saved[id]?.stars ?? 0, best_time_seconds: saved[id]?.best_time_seconds }));
  }
}
