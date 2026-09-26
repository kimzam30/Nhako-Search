import type { Difficulty } from '@/lib/puzzle/generator';
import { readJSON, writeJSON } from '@/lib/storage';

/*
 * Word choice with memory, so back-to-back games feel fresh.
 *
 * Free play used to remember the last 30 words in sessionStorage — lost on
 * every app restart, and 30 words is only four medium puzzles. Now each
 * theme+difficulty keeps a per-device history (localStorage) covering up to
 * 70% of its pool: a word is not offered again until most of the others have
 * been seen, and when the pool runs short the words seen LONGEST ago come back
 * first.
 */

const KEY = 'nhako_seen_words';
const MEMORY_SHARE = 0.7;

type Seen = Record<string, string[]>;

function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function wordCountFor(difficulty: Difficulty): number {
  return difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : 10;
}

export interface Picked {
  words: string[];
  /** Backfill for the generator, fresh words first. */
  reserve: string[];
}

/** Picks `count` words from `pool`, avoiding what this device saw recently. */
export function pickFresh(bucket: string, pool: string[], count: number): Picked {
  const unique = [...new Set(pool)];
  const all = readJSON<Seen>(KEY, {});
  const history = (all[bucket] ?? []).filter(w => unique.includes(w));
  const recent = new Set(history);

  const fresh = shuffle(unique.filter(w => !recent.has(w)));
  // Oldest-seen first: those are the least likely to feel repeated.
  const stale = history.filter(w => unique.includes(w));
  const ordered = [...fresh, ...stale];

  const words = ordered.slice(0, count);
  const reserve = ordered.slice(count, count + 30);

  const limit = Math.max(count, Math.floor(unique.length * MEMORY_SHARE));
  const nextHistory = [...history.filter(w => !words.includes(w)), ...words].slice(-limit);
  all[bucket] = nextHistory;
  writeJSON(KEY, all);

  return { words, reserve };
}

/**
 * Marks words as seen without picking them (e.g. the words a race actually
 * placed), so the next free-play game on this device avoids them too.
 */
export function markSeen(bucket: string, words: string[], poolSize: number) {
  const all = readJSON<Seen>(KEY, {});
  const history = (all[bucket] ?? []).filter(w => !words.includes(w));
  all[bucket] = [...history, ...words].slice(-Math.max(words.length, Math.floor(poolSize * MEMORY_SHARE)));
  writeJSON(KEY, all);
}

export function bucketFor(themeId: string, difficulty: Difficulty) {
  return `${themeId}:${difficulty}`;
}

export { shuffle };
