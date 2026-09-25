import { supabase } from '@/lib/multiplayer/supabase';

/**
 * Every localStorage/sessionStorage key this app owns.
 *
 * The old implementation called `localStorage.clear()`, which wiped the whole
 * origin — including Supabase's own auth tokens — while deleting nothing at all
 * from the database. The button did not do what it said.
 */
const LOCAL_KEYS = [
  'nhako_levels',
  'nhako_collection',
  'nhako_daily',
  'nhako_merged',
  'nhako_guest_mode',
  'nhako_guest_name',
  'nhako_last_room_created',
  'nhako_audio_volumes',
  'nhako_theme',
  'nhako_daily_stars',
];

const SESSION_KEY_PREFIXES = [
  'is_leader_',
  'nhako_recent_',
  'nhako_guest_id',
  'nhako_room_',
  'nhako_race_found_',
  'splash_seen',
];

export interface DeleteDataResult {
  ok: boolean;
  /** Tables that could not be cleared, if any. */
  failed: string[];
}

function clearLocalState() {
  if (typeof window === 'undefined') return;

  for (const key of LOCAL_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* private mode */
    }
  }

  try {
    // sessionStorage keys are dynamic (room codes, theme+difficulty pairs), so
    // match by prefix rather than listing them.
    const doomed: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && SESSION_KEY_PREFIXES.some(p => key.startsWith(p))) doomed.push(key);
    }
    doomed.forEach(k => sessionStorage.removeItem(k));
  } catch {
    /* private mode */
  }
}

/**
 * Deletes the signed-in user's rows, then clears local state and signs out.
 * Guests have no server rows, so only local state is cleared.
 */
export async function deleteAllUserData(): Promise<DeleteDataResult> {
  const failed: string[] = [];

  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (user) {
    // race_history is keyed by two columns, so it needs its own filter.
    const scopedTables = [
      'butterfly_collection',
      'daily_challenge_log',
      'level_progress',
    ] as const;

    for (const table of scopedTables) {
      const { error } = await supabase.from(table).delete().eq('user_id', user.id);
      if (error) failed.push(table);
    }

    const { error: raceError } = await supabase
      .from('race_history')
      .delete()
      .or(`player_a.eq.${user.id},player_b.eq.${user.id}`);
    if (raceError) failed.push('race_history');

    // Requires the profiles DELETE policy added in 002_security.sql.
    const { error: profileError } = await supabase.from('profiles').delete().eq('id', user.id);
    if (profileError) failed.push('profiles');
  }

  clearLocalState();
  await supabase.auth.signOut();

  return { ok: failed.length === 0, failed };
}
