import { test, expect } from '@playwright/test';
import { THEMES } from '../lib/words/themes';
import { CHAPTERS, getLevel } from '../lib/levels/data';
import { generateGrid } from '../lib/puzzle/generator';

/**
 * Word bank guards (no browser needed). Every word fits its board, appears in
 * one difficulty only, and the pools are big enough that the level path never
 * repeats a word and free play takes a long time to come round again.
 */

const MAX_LEN = { easy: 8, medium: 10, hard: 12 } as const;
// The level path deals each theme across two chapters (I and II):
// 10 easy x 6 + 12 medium x 8 + 8 hard x 10 words per chapter, so 120 / 192 /
// 160 words, plus one spare per level (20 / 24 / 16) for backfill.
const LEVEL_THEMES = new Set(['garden', 'rainy-day', 'cozy-cottage', 'night-sky', 'date-night', 'standard']);
const MIN_SIZE = { level: { easy: 140, medium: 216, hard: 176 }, free: { easy: 100, medium: 140, hard: 130 } };

for (const theme of THEMES) {
  test(`${theme.name}: clean, one difficulty per word, big enough`, () => {
    const seen = new Map<string, string>();
    for (const diff of ['easy', 'medium', 'hard'] as const) {
      const words = theme.words[diff];
      for (const w of words) {
        expect(w, `${theme.id}/${diff}`).toMatch(/^[A-Z]{3,}$/);
        expect(w.length, `${w} is too long for ${diff}`).toBeLessThanOrEqual(MAX_LEN[diff]);
        expect(seen.get(w), `${w} is in ${seen.get(w)} and ${diff}`).toBeUndefined();
        seen.set(w, diff);
      }
      const min = MIN_SIZE[LEVEL_THEMES.has(theme.id) ? 'level' : 'free'][diff];
      expect(words.length, `${theme.id}/${diff}`).toBeGreaterThanOrEqual(min);
    }
    // Typos found in audits, kept out for good.
    for (const typo of ['CROOCUS']) expect(seen.has(typo)).toBe(false);
  });
}

test('the level path never repeats a word within a theme', () => {
  // The words actually placed: a clash or a misfit is backfilled from the
  // reserve, which must not borrow a word another level already uses.
  const byTheme = new Map<string, string[]>();
  for (const chapter of CHAPTERS) {
    const words = byTheme.get(chapter.theme) ?? [];
    for (const id of chapter.levels) {
      const level = getLevel(id)!;
      const grid = generateGrid(level.words, level.difficulty, id, level.reserve);
      expect(grid.placedWords.length, id).toBe(level.words.length);
      words.push(...grid.placedWords.map(p => p.word));
    }
    byTheme.set(chapter.theme, words);
  }
  for (const [theme, words] of byTheme) {
    const repeats = words.filter((w, i) => words.indexOf(w) !== i);
    expect(repeats, theme).toEqual([]);
  }
});
