import type { Difficulty } from '@/lib/puzzle/generator';
import { saveLevelProgress } from '@/lib/levels/progress';
import { saveDailyChallenge } from '@/lib/daily/logic';
import { currentSummary, patchSummary, refreshSummary } from '@/lib/data/player';
import { recordClear } from '@/lib/rewards/journal';
import { rewardFor, total, type RewardLine } from '@/lib/rewards/economy';
import { earnTokens } from '@/lib/rewards/wallet';

/*
 * One path for "a solo puzzle was just finished", whatever the mode: save the
 * result, note how it was solved, pay the tokens, and hand back the reward
 * lines for the win screen. The summary is patched first so the HUD, map and
 * streak are already right when the player taps back out.
 */

export interface SoloResult {
  mode: 'level' | 'free' | 'daily';
  difficulty: Difficulty;
  stars: number;
  seconds: number;
  hints: number;
  words: number;
  levelId?: string;
  theme?: string;
}

export async function completeSolo(r: SoloResult): Promise<RewardLine[]> {
  const before = await currentSummary();
  recordClear({
    difficulty: r.difficulty,
    seconds: r.seconds,
    hints: r.hints,
    words: r.words,
    theme: r.theme,
    freePlay: r.mode === 'free',
  });

  let lines: RewardLine[];
  if (r.mode === 'level' && r.levelId) {
    const prev = before.levels.find(l => l.level_id === r.levelId)?.stars ?? 0;
    lines = rewardFor({ mode: 'level', difficulty: r.difficulty, stars: r.stars, hintsUsed: r.hints, improved: r.stars > prev });
    await patchSummary(s => {
      const others = s.levels.filter(l => l.level_id !== r.levelId);
      const old = s.levels.find(l => l.level_id === r.levelId);
      return {
        ...s,
        levels: [...others, { level_id: r.levelId!, stars: Math.max(old?.stars ?? 0, r.stars), best_time_seconds: Math.min(old?.best_time_seconds ?? Infinity, r.seconds) }],
      };
    });
    await saveLevelProgress(r.levelId, r.stars, r.seconds);
  } else if (r.mode === 'daily') {
    const firstToday = !before.playedToday;
    const streak = firstToday ? before.streak + 1 : before.streak;
    lines = firstToday
      ? rewardFor({ mode: 'daily', difficulty: r.difficulty, stars: r.stars, hintsUsed: r.hints, streak })
      : [{ label: 'Replay', amount: 1 }];
    if (firstToday) {
      await patchSummary(s => ({ ...s, playedToday: true, streak, bestStreak: Math.max(s.bestStreak, streak) }));
    }
    await saveDailyChallenge(r.stars);
  } else {
    lines = rewardFor({ mode: 'free', difficulty: r.difficulty, stars: r.stars, hintsUsed: r.hints });
  }

  await earnTokens(total(lines));
  refreshSummary();
  return lines;
}
