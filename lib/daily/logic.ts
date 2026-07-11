import { supabase } from '@/lib/multiplayer/supabase';

export function getDailySeed() {
  const d = new Date();
  return `daily-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export async function checkDailyStreak() {
  const { data: user } = await supabase.auth.getUser();
  if (user.user) {
    const { data } = await supabase
      .from('daily_challenge_log')
      .select('*')
      .eq('user_id', user.user.id)
      .order('challenge_date', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      const lastDate = new Date(data[0].challenge_date);
      const today = new Date();
      // Normalize to UTC midnight for fair comparison
      lastDate.setUTCHours(0,0,0,0);
      const todayDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      
      const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return { streak: data[0].streak_count, playedToday: true };
      if (diffDays === 1) return { streak: data[0].streak_count, playedToday: false };
      return { streak: 0, playedToday: false };
    }
  } else {
    // guest logic
    const saved = JSON.parse(localStorage.getItem('nhako_daily') || '{}');
    if (saved.lastDate) {
      const lastDate = new Date(saved.lastDate);
      const today = new Date();
      lastDate.setUTCHours(0,0,0,0);
      const todayDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      
      const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return { streak: saved.streak || 1, playedToday: true };
      if (diffDays === 1) return { streak: saved.streak || 1, playedToday: false };
      return { streak: 0, playedToday: false };
    }
  }
  return { streak: 0, playedToday: false };
}

export async function saveDailyChallenge() {
  const { streak, playedToday } = await checkDailyStreak();
  if (playedToday) return; 
  
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const newStreak = streak + 1;
  
  const { data: user } = await supabase.auth.getUser();
  if (user.user) {
    await supabase.from('daily_challenge_log').insert({
      user_id: user.user.id,
      challenge_date: dateStr,
      streak_count: newStreak
    });
    
    await supabase.from('butterfly_collection').insert({
      user_id: user.user.id,
      butterfly_style_id: 'daily-' + dateStr,
      earned_from: 'daily'
    });
  } else {
    localStorage.setItem('nhako_daily', JSON.stringify({ lastDate: dateStr, streak: newStreak }));
    
    const collection = JSON.parse(localStorage.getItem('nhako_collection') || '[]');
    collection.push({ butterfly_style_id: 'daily-' + dateStr, earned_from: 'daily', earned_at: new Date().toISOString() });
    localStorage.setItem('nhako_collection', JSON.stringify(collection));
  }
}
