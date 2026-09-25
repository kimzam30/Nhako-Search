import { supabase } from '@/lib/multiplayer/supabase';
import type { CollectionEntry, LevelProgressRow } from '@/lib/types';
import { readJSON, writeJSON } from '@/lib/storage';

type LocalLevels = Record<string, { stars?: number; best_time_seconds?: number }>;

export async function saveLevelProgress(levelId: string, stars: number, timeSeconds: number) {
  const { data: user } = await supabase.auth.getUser();
  const butterflyId = `level-${levelId}`;
  
  if (user.user) {
    // Keep the best result. The old code upserted the latest values straight in,
    // so replaying a 3-star level slowly demoted it to 1 star and overwrote the
    // best time — while the guest path below correctly kept the maximum.
    const { data: existingProgress } = await supabase
      .from('level_progress')
      .select('stars, best_time_seconds')
      .eq('user_id', user.user.id)
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
        { user_id: user.user.id, level_id: levelId, stars: bestStars, best_time_seconds: bestTime },
        { onConflict: 'user_id,level_id' }
      );
    if (error) console.error('Save level error:', error);
    
    // Earn butterfly for completing level.
    //
    // Upsert, not select-then-insert: the old check-then-act let two calls
    // close together (a double-fired effect, a fast replay) both read zero
    // rows and both insert, which really did duplicate awards in production.
    // Requires butterfly_collection_user_style_key — see 003_integrity.sql.
    const { error: butterflyError } = await supabase
      .from('butterfly_collection')
      .upsert(
        {
          user_id: user.user.id,
          butterfly_style_id: butterflyId,
          earned_from: `Level ${levelId}`,
        },
        { onConflict: 'user_id,butterfly_style_id', ignoreDuplicates: true }
      );
    if (butterflyError) console.error('Award butterfly error:', butterflyError);
  } else {
    // Fallback to local storage for guest
    const saved = readJSON<LocalLevels>('nhako_levels', {});
    const prevTime = saved[levelId]?.best_time_seconds;
    saved[levelId] = {
      stars: Math.max(saved[levelId]?.stars || 0, stars),
      best_time_seconds: typeof prevTime === 'number' ? Math.min(prevTime, timeSeconds) : timeSeconds,
    };
    writeJSON('nhako_levels', saved);

    const collection = readJSON<CollectionEntry[]>('nhako_collection', []);
    if (!collection.find(c => c.butterfly_style_id === butterflyId)) {
      collection.push({ butterfly_style_id: butterflyId, earned_from: `Level ${levelId}`, earned_at: new Date().toISOString() });
      writeJSON('nhako_collection', collection);
    }
  }
}

export async function loadLevelProgress(): Promise<LevelProgressRow[]> {
  const { data: user } = await supabase.auth.getUser();
  if (user.user) {
    const { data, error } = await supabase.from('level_progress').select('*');
    if (error) console.error('Load levels error:', error);
    return data || [];
  } else {
    const saved = readJSON<LocalLevels>('nhako_levels', {});
    return Object.keys(saved).map(id => ({ level_id: id, stars: saved[id]?.stars ?? 0, best_time_seconds: saved[id]?.best_time_seconds }));
  }
}
