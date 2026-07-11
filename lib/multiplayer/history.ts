import { supabase } from '@/lib/multiplayer/supabase';

export async function saveRaceHistory(playerA: string, playerB: string, winner: string, diffA: string, diffB: string) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return; // Only save if signed in

  // To prevent double writing, only the winner writes the record, OR player A writes it if it's a tie
  // But wait, what if winner is guest? Then it won't be written.
  // We can just rely on the host (player A) writing it.
  
  if (user.user.id !== playerA) return;

  const { error } = await supabase.from('race_history').insert({
    player_a: playerA,
    player_b: playerB.startsWith('guest-') ? null : playerB,
    winner: winner.startsWith('guest-') ? null : winner,
    difficulty_a: diffA,
    difficulty_b: diffB
  });

  if (error) {
    console.error("Failed to save race history:", error);
  }
}
