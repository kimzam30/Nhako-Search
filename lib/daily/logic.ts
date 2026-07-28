import { supabase } from '@/lib/multiplayer/supabase';

/**
 * The daily challenge runs on one fixed timezone for everyone.
 *
 * Previously the seed and the saved date were built from LOCAL date parts while
 * the streak comparison normalised to UTC midnight. Near midnight that produced
 * off-by-one streaks, and two players in different timezones could get
 * different "daily" puzzles on the same day.
 *
 * UTC+8 (Malaysia) — change this one constant to move the rollover.
 */
export const GAME_DAY_UTC_OFFSET_MINUTES = 8 * 60;

/** The current game day as YYYY-MM-DD, in the fixed game timezone. */
export function gameDateString(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + GAME_DAY_UTC_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** Whole days from `fromISO` to `toISO`, both YYYY-MM-DD. Signed. */
export function daysBetween(fromISO: string, toISO: string): number {
  const from = Date.parse(`${fromISO}T00:00:00Z`);
  const to = Date.parse(`${toISO}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return Number.NaN;
  return Math.round((to - from) / 86_400_000);
}

export function getDailySeed(): string {
  return `daily-${gameDateString()}`;
}

export interface DailyStreak {
  streak: number;
  playedToday: boolean;
}

/** Resolves a stored (date, streak) pair against today. */
function resolveStreak(lastDate: string, storedStreak: number): DailyStreak {
  const gap = daysBetween(lastDate, gameDateString());

  if (Number.isNaN(gap)) return { streak: 0, playedToday: false };
  // gap <= 0 means the record is for today (or, with clock skew, the future).
  // The old code used Math.abs here, so a future date counted as a valid
  // one-day gap and let the streak be extended again.
  if (gap <= 0) return { streak: storedStreak, playedToday: true };
  // Played yesterday: the streak is still alive, today is not done yet.
  if (gap === 1) return { streak: storedStreak, playedToday: false };
  return { streak: 0, playedToday: false };
}

export async function checkDailyStreak(): Promise<DailyStreak> {
  const { data: user } = await supabase.auth.getUser();

  if (user.user) {
    const { data } = await supabase
      .from('daily_challenge_log')
      .select('challenge_date, streak_count')
      .eq('user_id', user.user.id)
      .order('challenge_date', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      // Postgres `date` comes back as YYYY-MM-DD already.
      return resolveStreak(String(data[0].challenge_date).slice(0, 10), data[0].streak_count);
    }
    return { streak: 0, playedToday: false };
  }

  const saved = JSON.parse(localStorage.getItem('nhako_daily') || '{}');
  if (saved.lastDate) {
    return resolveStreak(String(saved.lastDate).slice(0, 10), saved.streak || 1);
  }
  return { streak: 0, playedToday: false };
}

/**
 * Which of the last `days` game-days were actually played, oldest first.
 *
 * The calendar strip used to be `mockHistory` derived from the streak number,
 * so it could never show a gap — a 3-day streak always rendered as three solid
 * dots regardless of what really happened.
 */
export async function getRecentDailyHistory(days = 7): Promise<boolean[]> {
  const today = gameDateString();
  const wanted: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.parse(`${today}T00:00:00Z`) - i * 86_400_000);
    wanted.push(d.toISOString().slice(0, 10));
  }

  const played = new Set<string>();
  const { data: user } = await supabase.auth.getUser();

  if (user.user) {
    const { data } = await supabase
      .from('daily_challenge_log')
      .select('challenge_date')
      .eq('user_id', user.user.id)
      .gte('challenge_date', wanted[0])
      .lte('challenge_date', wanted[wanted.length - 1]);
    (data ?? []).forEach(row => played.add(String(row.challenge_date).slice(0, 10)));
  } else {
    const saved = JSON.parse(localStorage.getItem('nhako_daily') || '{}');
    const history: string[] = Array.isArray(saved.history) ? saved.history : [];
    history.forEach(d => played.add(String(d).slice(0, 10)));
    // Older saves only recorded the most recent day.
    if (saved.lastDate) played.add(String(saved.lastDate).slice(0, 10));
  }

  return wanted.map(d => played.has(d));
}

export async function saveDailyChallenge(): Promise<void> {
  const { streak, playedToday } = await checkDailyStreak();
  if (playedToday) return;

  const dateStr = gameDateString();
  const newStreak = streak + 1;

  const { data: user } = await supabase.auth.getUser();
  if (user.user) {
    await supabase.from('daily_challenge_log').upsert(
      {
        user_id: user.user.id,
        challenge_date: dateStr,
        streak_count: newStreak,
      },
      { onConflict: 'user_id,challenge_date' }
    );

    await supabase.from('butterfly_collection').insert({
      user_id: user.user.id,
      butterfly_style_id: 'daily-' + dateStr,
      earned_from: 'daily',
    });
  } else {
    const prev = JSON.parse(localStorage.getItem('nhako_daily') || '{}');
    const history: string[] = Array.isArray(prev.history) ? prev.history : [];
    if (prev.lastDate && !history.includes(prev.lastDate)) history.push(prev.lastDate);
    if (!history.includes(dateStr)) history.push(dateStr);
    localStorage.setItem(
      'nhako_daily',
      // Keep a month so the calendar strip has real gaps to show.
      JSON.stringify({ lastDate: dateStr, streak: newStreak, history: history.slice(-31) })
    );

    const collection = JSON.parse(localStorage.getItem('nhako_collection') || '[]');
    collection.push({
      butterfly_style_id: 'daily-' + dateStr,
      earned_from: 'daily',
      earned_at: new Date().toISOString(),
    });
    localStorage.setItem('nhako_collection', JSON.stringify(collection));
  }
}
