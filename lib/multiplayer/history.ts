import { supabase } from '@/lib/multiplayer/supabase';
import { readJSON, writeJSON } from '@/lib/storage';
import type { CollectionEntry } from '@/lib/types';

/**
 * Grants the "together" butterfly for clearing a co-op board.
 *
 * The profile screen already had styling for a `together-` butterfly, but
 * nothing in the app ever awarded one. Each player records their own, so both
 * collections get it (unlike race history, which is leader-only).
 */
export async function awardTogetherButterfly(roomCode: string, gameDate: string) {
  const styleId = `together-${roomCode}-${gameDate}`;
  const { data: user } = await supabase.auth.getUser();

  if (user.user) {
    // Upsert rather than select-then-insert: both players clear the board at
    // the same instant, and the effect that calls this can fire more than
    // once, so the old check-then-act could award the same butterfly twice.
    await supabase.from('butterfly_collection').upsert(
      {
        user_id: user.user.id,
        butterfly_style_id: styleId,
        earned_from: 'Solved together',
      },
      { onConflict: 'user_id,butterfly_style_id', ignoreDuplicates: true }
    );
    return;
  }

  const collection = readJSON<CollectionEntry[]>('nhako_collection', []);
  if (collection.some(c => c.butterfly_style_id === styleId)) {
    return;
  }
  collection.push({
    butterfly_style_id: styleId,
    earned_from: 'Solved together',
    earned_at: new Date().toISOString(),
  });
  writeJSON('nhako_collection', collection);
}

/**
 * Records a finished race.
 *
 * Only the room leader calls this. Previously both clients did: each one
 * initialised its own state as "playerA", so the `id !== playerA` guard passed
 * on both machines and a single match wrote two rows, inflating Wins.
 *
 * Guests have no auth row, so their ids are stored as NULL.
 */
export async function saveRaceHistory(
  leaderId: string,
  opponentId: string,
  winnerId: string,
  diffLeader: string,
  diffOpponent: string
) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return; // Guests cannot write history.

  // Defensive: the caller should already be the leader.
  if (user.user.id !== leaderId) return;

  const asUuidOrNull = (id: string) => (id.startsWith('guest-') ? null : id);

  const { error } = await supabase.from('race_history').insert({
    player_a: leaderId,
    player_b: asUuidOrNull(opponentId),
    winner: asUuidOrNull(winnerId),
    difficulty_a: diffLeader,
    difficulty_b: diffOpponent,
  });

  if (error) {
    console.error('Failed to save race history:', error);
  }
}
