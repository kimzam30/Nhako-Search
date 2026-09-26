import type { Difficulty } from '@/lib/puzzle/generator';

/*
 * Butterfly tokens: the game's one soft currency.
 *
 * Earned by finishing puzzles, spent on hints. A hint with no tokens is still
 * available — nobody should be stuck — but it costs time instead, and the
 * cost grows with each one, so spamming hints is never the fast way through.
 * Every hint also has a short cooldown.
 */

export const HINT_COST = 4;
/** Minimum gap between two hints, paid or free. */
export const HINT_COOLDOWN_MS = 8_000;
/** Time added for the n-th free hint (0-based) on one board. */
export function freeHintPenaltySeconds(n: number): number {
  return 20 + n * 10;
}

/** Stars from the finishing time, which includes any hint penalty. */
export function starsFor(difficulty: Difficulty, seconds: number): number {
  const [three, two] = STAR_TIMES[difficulty];
  return seconds <= three ? 3 : seconds <= two ? 2 : 1;
}
/** [3-star, 2-star] cut-offs in seconds. A 13×13 board is not a 60-second job. */
export const STAR_TIMES: Record<Difficulty, [number, number]> = {
  easy: [45, 90],
  medium: [75, 150],
  hard: [120, 240],
};

export type RewardMode = 'level' | 'free' | 'daily' | 'race-win' | 'race-loss' | 'together';

export interface RewardInput {
  mode: RewardMode;
  difficulty: Difficulty;
  stars?: number;
  hintsUsed?: number;
  /** Levels only: false when the level already had these stars or more. */
  improved?: boolean;
  /** Daily only: the streak including today. */
  streak?: number;
}

export interface RewardLine {
  label: string;
  amount: number;
}

const BASE: Record<Difficulty, number> = { easy: 3, medium: 5, hard: 8 };

export function rewardFor(input: RewardInput): RewardLine[] {
  const lines: RewardLine[] = [];
  const { mode, difficulty } = input;

  if (mode === 'race-win') return [{ label: 'Race won', amount: 8 }];
  if (mode === 'race-loss') return [{ label: 'Good race', amount: 3 }];
  if (mode === 'together') return [{ label: 'Cleared together', amount: 6 }];

  if (mode === 'level' && input.improved === false) {
    // Replays still pay a little, so grinding is possible but not the best use of time.
    return [{ label: 'Replay', amount: 1 }];
  }

  lines.push({ label: mode === 'daily' ? 'Daily puzzle' : 'Puzzle', amount: mode === 'daily' ? 10 : BASE[difficulty] });
  const bonusStars = Math.max(0, (input.stars ?? 1) - 1);
  if (bonusStars) lines.push({ label: `${input.stars} stars`, amount: bonusStars });
  if ((input.hintsUsed ?? 0) === 0) lines.push({ label: 'No hints', amount: 2 });
  if (mode === 'daily' && (input.streak ?? 0) > 1) {
    lines.push({ label: `${input.streak}-day streak`, amount: Math.min(input.streak ?? 0, 7) });
  }
  return lines;
}

export const ACHIEVEMENT_BONUS = 15;

export function total(lines: RewardLine[]): number {
  return lines.reduce((n, l) => n + l.amount, 0);
}
