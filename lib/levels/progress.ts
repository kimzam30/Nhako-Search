import { supabase } from '@/lib/multiplayer/supabase';

export async function saveLevelProgress(levelId: string, stars: number, timeSeconds: number) {
  const { data: user } = await supabase.auth.getUser();
  const butterflyId = `level-${levelId}`;
  
  if (user.user) {
    const { error } = await supabase
      .from('level_progress')
      .upsert({ user_id: user.user.id, level_id: levelId, stars, best_time_seconds: timeSeconds }, { onConflict: 'user_id,level_id' });
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
    saved[levelId] = { stars: Math.max(saved[levelId]?.stars || 0, stars), best_time_seconds: timeSeconds };
    localStorage.setItem('nhako_levels', JSON.stringify(saved));
    
    const collection = JSON.parse(localStorage.getItem('nhako_collection') || '[]');
    if (!collection.find((c: any) => c.butterfly_style_id === butterflyId)) {
      collection.push({ butterfly_style_id: butterflyId, earned_from: `Level ${levelId}`, earned_at: new Date().toISOString() });
      localStorage.setItem('nhako_collection', JSON.stringify(collection));
    }
  }
}

export async function loadLevelProgress() {
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
