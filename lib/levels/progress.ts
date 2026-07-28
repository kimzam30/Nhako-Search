import { supabase } from '@/lib/multiplayer/supabase';
import type { CollectionEntry, LevelProgressRow } from '@/lib/types';

export async function saveLevelProgress(levelId: string, stars: number, timeSeconds: number) {
  const { data: user } = await supabase.auth.getUser();
  const butterflyId = `level-${levelId}`;
  
  if (user.user) {
    // Keep the best result. The old code upserted the latest values straight in,
    // so replaying a 3-star level slowly demoted it to 1 star and overwrote the
    // best time — while the guest path below correctly kept the maximum.
    const { data: existing } = await supabase
      .from('level_progress')
      .select('stars, best_time_seconds')
      .eq('user_id', user.user.id)
      .eq('level_id', levelId)
      .maybeSingle();

    const bestStars = Math.max(existing?.stars ?? 0, stars);
    const bestTime =
      existing?.best_time_seconds != null
        ? Math.min(existing.best_time_seconds, timeSeconds)
        : timeSeconds;

    const { error } = await supabase
      .from('level_progress')
      .upsert(
        { user_id: user.user.id, level_id: levelId, stars: bestStars, best_time_seconds: bestTime },
        { onConflict: 'user_id,level_id' }
      );
    if (error) console.error('Save level error:', error);
    
    // Earn butterfly for completing level
    const { data: existing } = await supabase
      .from('butterfly_collection')
      .select('id')
      .eq('user_id', user.user.id)
      .eq('butterfly_style_id', butterflyId);
      
    if (!existing || existing.length === 0) {
      await supabase.from('butterfly_collection').insert({
        user_id: user.user.id,
        butterfly_style_id: butterflyId,
        earned_from: `Level ${levelId}`
      });
    }
  } else {
    // Fallback to local storage for guest
    const saved = JSON.parse(localStorage.getItem('nhako_levels') || '{}');
    const prevTime = saved[levelId]?.best_time_seconds;
    saved[levelId] = {
      stars: Math.max(saved[levelId]?.stars || 0, stars),
      best_time_seconds: typeof prevTime === 'number' ? Math.min(prevTime, timeSeconds) : timeSeconds,
    };
    localStorage.setItem('nhako_levels', JSON.stringify(saved));
    
    const collection = JSON.parse(localStorage.getItem('nhako_collection') || '[]');
    if (!(collection as CollectionEntry[]).find(c => c.butterfly_style_id === butterflyId)) {
      collection.push({ butterfly_style_id: butterflyId, earned_from: `Level ${levelId}`, earned_at: new Date().toISOString() });
      localStorage.setItem('nhako_collection', JSON.stringify(collection));
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
    const saved = JSON.parse(localStorage.getItem('nhako_levels') || '{}');
    return Object.keys(saved).map(id => ({ level_id: id, ...saved[id] }));
  }
}
