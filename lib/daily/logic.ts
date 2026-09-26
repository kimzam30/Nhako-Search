import { getCurrentUser } from '@/lib/auth/session';
import { supabase } from '@/lib/multiplayer/supabase';
import { readJSON, writeJSON } from '@/lib/storage';

/**
 * The daily challenge runs on one fixed timezone for everyone.
 *
 * Previously the seed and the saved date were built from LOCAL date parts while
 * the streak comparison normalised to UTC midnight. Near midnight that produced
 * off-by-one streaks, and two players in different timezones could get
 * different "daily" puzzles on the same day.
 *
 * UTC+8 (Malaysia). Change this one constant to move the rollover.
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

/**
 * Today's daily theme. Every player gets the same one; it rotates through the
 * free-play themes day by day, so consecutive dailies never share a word pool.
 */
export function dailyThemeIndex(date: string = gameDateString(), themeCount: number): number {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return ((day % themeCount) + themeCount) % themeCount;
}

/**
 * The current game day as a display label ("Saturday, Sep 27").
 *
 * Formatted from the game-day string in UTC, not from the device's local
 * date: outside UTC+8 the header used to show yesterday's or tomorrow's date
 * above today's puzzle.
 */
export function gameDayLabel(now: Date = new Date()): string {
  return new Date(`${gameDateString(now)}T00:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

interface LocalDaily {
  lastDate?: string;
  streak?: number;
  history?: string[];
}

const DAILY_STARS_KEY = 'nhako_daily_stars';

/** Stars earned on a given game day's puzzle, if played on this device. */
export function getDailyStars(date: string = gameDateString()): number | null {
  const stars = readJSON<Record<string, number>>(DAILY_STARS_KEY, {})[date];
  return typeof stars === 'number' ? stars : null;
}

/** Longest run of consecutive days in a list of YYYY-MM-DD dates. */
export function longestRun(dates: string[]): number {
  const sorted = [...new Set(dates.map(d => String(d).slice(0, 10)))].sort();
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && daysBetween(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

export interface DailyStreak {
  streak: number;
  playedToday: boolean;
}

/** Resolves a stored (date, streak) pair against today. */
export function resolveStreak(lastDate: string, storedStreak: number): DailyStreak {
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
  const authUser = await getCurrentUser();

  if (authUser) {
    const { data } = await supabase
      .from('daily_challenge_log')
      .select('challenge_date, streak_count')
      .eq('user_id', authUser.id)
      .order('challenge_date', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      // Postgres `date` comes back as YYYY-MM-DD already.
      return resolveStreak(String(data[0].challenge_date).slice(0, 10), data[0].streak_count);
    }
    return { streak: 0, playedToday: false };
  }

  const saved = readJSON<LocalDaily>('nhako_daily', {});
  if (saved.lastDate) {
    return resolveStreak(String(saved.lastDate).slice(0, 10), saved.streak || 1);
  }
  return { streak: 0, playedToday: false };
}

/**
 * Which of the last `days` game-days were actually played, oldest first.
 *
 * The calendar strip used to be `mockHistory` derived from the streak number,
 * so it could never show a gap: a 3-day streak always rendered as three solid
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
  const authUser = await getCurrentUser();

  if (authUser) {
    const { data } = await supabase
      .from('daily_challenge_log')
      .select('challenge_date')
      .eq('user_id', authUser.id)
      .gte('challenge_date', wanted[0])
      .lte('challenge_date', wanted[wanted.length - 1]);
    (data ?? []).forEach(row => played.add(String(row.challenge_date).slice(0, 10)));
  } else {
    const saved = readJSON<LocalDaily>('nhako_daily', {});
    const history: string[] = Array.isArray(saved.history) ? saved.history : [];
    history.forEach(d => played.add(String(d).slice(0, 10)));
    // Older saves only recorded the most recent day.
    if (saved.lastDate) played.add(String(saved.lastDate).slice(0, 10));
  }

  return wanted.map(d => played.has(d));
}

export async function saveDailyChallenge(stars?: number): Promise<void> {
  const dateStr = gameDateString();
  // Stars are kept per device; the server log has no column for them. The
  // completed screen used to show three stars no matter how the puzzle went.
  if (typeof stars === 'number') {
    const all = readJSON<Record<string, number>>(DAILY_STARS_KEY, {});
    all[dateStr] = Math.max(all[dateStr] ?? 0, stars);
    // Keep roughly a month.
    const trimmed = Object.fromEntries(Object.entries(all).sort().slice(-31));
    writeJSON(DAILY_STARS_KEY, trimmed);
  }

  const { streak, playedToday } = await checkDailyStreak();
  if (playedToday) return;

  const newStreak = streak + 1;

  const authUser = await getCurrentUser();
  if (authUser) {
    await supabase.from('daily_challenge_log').upsert(
      {
        user_id: authUser.id,
        challenge_date: dateStr,
        streak_count: newStreak,
      },
      { onConflict: 'user_id,challenge_date' }
    );

    // Upsert so a second call for the same game day cannot duplicate the
    // award. The playedToday guard above already returns early in the normal
    // case; this covers two calls racing before either has committed.
    await supabase.from('butterfly_collection').upsert(
      {
        user_id: authUser.id,
        butterfly_style_id: 'daily-' + dateStr,
        earned_from: 'daily',
      },
      { onConflict: 'user_id,butterfly_style_id', ignoreDuplicates: true }
    );
  } else {
    const prev = readJSON<LocalDaily>('nhako_daily', {});
    const history: string[] = Array.isArray(prev.history) ? prev.history : [];
    if (prev.lastDate && !history.includes(prev.lastDate)) history.push(prev.lastDate);
    if (!history.includes(dateStr)) history.push(dateStr);
    // Keep a month so the calendar strip has real gaps to show.
    writeJSON('nhako_daily', { lastDate: dateStr, streak: newStreak, history: history.slice(-31) });

    // Guests get the same once-per-style rule the unique index enforces for
    // signed-in players; without this guard a replay appended a second copy,
    // which then merged into the account on sign-in.
    const styleId = 'daily-' + dateStr;
    const collection = readJSON<{ butterfly_style_id?: string }[]>('nhako_collection', []);
    if (!collection.some(c => c.butterfly_style_id === styleId)) {
      collection.push({
        butterfly_style_id: styleId,
        earned_from: 'daily',
        earned_at: new Date().toISOString(),
      } as { butterfly_style_id: string });
      writeJSON('nhako_collection', collection);
    }
  }
}
