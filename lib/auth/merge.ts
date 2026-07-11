import { supabase } from '@/lib/multiplayer/supabase';

export async function mergeGuestProgress() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('nhako_merged') === 'true') return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    // 1. Merge Levels
    const localLevels = JSON.parse(localStorage.getItem('nhako_levels') || '{}');
    const levelEntries = Object.keys(localLevels).map(level_id => ({
      user_id: user.id,
      level_id,
      stars: localLevels[level_id].stars,
      best_time_seconds: localLevels[level_id].best_time_seconds,
      completed_at: new Date().toISOString()
    }));

    if (levelEntries.length > 0) {
      await supabase.from('level_progress').upsert(levelEntries, { onConflict: 'user_id,level_id' });
    }

    // 2. Merge Collection
    const localCollection = JSON.parse(localStorage.getItem('nhako_collection') || '[]');
    const collectionEntries = localCollection.map((c: any) => ({
      user_id: user.id,
      butterfly_style_id: c.butterfly_style_id,
      earned_from: c.earned_from,
      earned_at: c.earned_at
    }));

    if (collectionEntries.length > 0) {
      // Avoid inserting duplicates manually by checking first
      const { data: existing } = await supabase.from('butterfly_collection').select('butterfly_style_id, earned_at');
      const existingIds = new Set(existing?.map(e => e.butterfly_style_id));
      const newEntries = collectionEntries.filter((c: any) => !existingIds.has(c.butterfly_style_id));
      if (newEntries.length > 0) {
        await supabase.from('butterfly_collection').insert(newEntries);
      }
    }

    // 3. Merge Daily
    const localDaily = JSON.parse(localStorage.getItem('nhako_daily') || '{}');
    if (localDaily.lastDate) {
      // Upsert keeping max streak could be complex, but upsert with onConflict is fine
      await supabase.from('daily_challenge_log').upsert({
        user_id: user.id,
        challenge_date: localDaily.lastDate,
        streak_count: localDaily.streak || 1,
        completed_at: new Date().toISOString()
      }, { onConflict: 'user_id,challenge_date' });
    }

    localStorage.setItem('nhako_merged', 'true');
    // Wipe local storage keys so we don't accidentally re-merge or have stale data
    localStorage.removeItem('nhako_levels');
    localStorage.removeItem('nhako_collection');
    localStorage.removeItem('nhako_daily');
  } catch (err) {
    console.error('Merge progress error:', err);
  }
}
