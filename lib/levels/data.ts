import gardenWords from '../words/garden.json';
import rainyDayWords from '../words/rainy-day.json';
import cozyCottageWords from '../words/cozy-cottage.json';
import nightSkyWords from '../words/night-sky.json';
import dateNightWords from '../words/date-night.json';
import standardWords from '../words/standard.json';

export type LevelDifficulty = 'easy' | 'medium' | 'hard';

export interface LevelData {
  id: string;
  chapter: string;
  difficulty: LevelDifficulty;
  words: string[];
  /** Backfill for the generator if a word clashes or cannot be placed. */
  reserve: string[];
}

/** Cheap facts about a level: no word list, so no shuffling. */
export interface LevelMeta {
  id: string;
  chapter: string;
  difficulty: LevelDifficulty;
  /** 1-based position inside its chapter, for display. */
  numberInChapter: number;
}

const THEME_DATA = [
  { id: 'c1', name: 'Garden', words: gardenWords },
  { id: 'c2', name: 'Rainy Day', words: rainyDayWords },
  { id: 'c3', name: 'Cozy Cottage', words: cozyCottageWords },
  { id: 'c4', name: 'Night Sky', words: nightSkyWords },
  { id: 'c5', name: 'Date Night', words: dateNightWords },
  { id: 'c6', name: 'Standard', words: standardWords },
  { id: 'c7', name: 'Garden II', words: gardenWords },
  { id: 'c8', name: 'Rainy Day II', words: rainyDayWords },
  { id: 'c9', name: 'Cozy Cottage II', words: cozyCottageWords },
  { id: 'c10', name: 'Night Sky II', words: nightSkyWords },
  { id: 'c11', name: 'Date Night II', words: dateNightWords },
  { id: 'c12', name: 'Standard II', words: standardWords },
];

const LEVELS_PER_CHAPTER = 30;

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function difficultyForIndex(i: number): LevelDifficulty {
  if (i >= 22) return 'hard';
  if (i >= 10) return 'medium';
  return 'easy';
}

// ---------------------------------------------------------------------------
// Eager layer: ids, names and difficulty only.
//
// Building all 360 word lists at module load meant every page importing this
// file (including the home screen, which only needs a chapter name) paid for
// 360 shuffles of a ~130-word pool before it could render.
// ---------------------------------------------------------------------------

export const CHAPTERS: { id: string; name: string; levels: string[] }[] = [];
export const ALL_LEVEL_IDS: string[] = [];

const META = new Map<string, LevelMeta & { themeIndex: number; indexInChapter: number }>();

{
  let levelCounter = 1;
  THEME_DATA.forEach((theme, themeIndex) => {
    const levels: string[] = [];
    for (let i = 0; i < LEVELS_PER_CHAPTER; i++) {
      const levelId = `${theme.id}-l${levelCounter}`;
      levels.push(levelId);
      ALL_LEVEL_IDS.push(levelId);
      META.set(levelId, {
        id: levelId,
        chapter: theme.name,
        difficulty: difficultyForIndex(i),
        numberInChapter: i + 1,
        themeIndex,
        indexInChapter: i,
      });
      levelCounter++;
    }
    CHAPTERS.push({ id: theme.id, name: theme.name, levels });
  });
}

export function getLevelMeta(levelId: string): LevelMeta | undefined {
  return META.get(levelId);
}

/** How many words a level contains, without generating its word list. */
export function wordCountForDifficulty(difficulty: LevelDifficulty): number {
  return difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : 10;
}

/**
 * Total words in a set of completed levels. Completing a level requires
 * finding every word, so this is exact rather than an estimate.
 */
export function wordsFoundForLevels(levelIds: string[]): number {
  return levelIds.reduce((sum, id) => {
    const meta = META.get(id);
    return meta ? sum + wordCountForDifficulty(meta.difficulty) : sum;
  }, 0);
}

// ---------------------------------------------------------------------------
// Lazy layer: word lists, generated on first request and cached.
// ---------------------------------------------------------------------------

const wordCache = new Map<string, LevelData>();
const deckCache = new Map<string, string[]>();

function chapterDeck(themeIndex: number, difficulty: LevelDifficulty, pool: string[]): string[] {
  const key = `${themeIndex}:${difficulty}`;
  const cached = deckCache.get(key);
  if (cached) return cached;
  // Fisher-Yates with a seeded PRNG: `sort(() => random() - 0.5)` depends on
  // the engine's sort, so the same level could differ between browsers.
  const random = mulberry32((themeIndex + 1) * 100003 + DIFFICULTY_SALT[difficulty]);
  const deck = [...new Set(pool)];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  deckCache.set(key, deck);
  return deck;
}

/** Chapter I's index for a "II" chapter (they share a word list). */
function baseTheme(themeIndex: number): number {
  return THEME_DATA.findIndex(t => t.words === THEME_DATA[themeIndex].words);
}

const DIFFICULTY_SALT: Record<LevelDifficulty, number> = { easy: 11, medium: 7919, hard: 104729 };

/** Words drawn by earlier levels of the same chapter and difficulty. */
function wordsBefore(themeIndex: number, indexInChapter: number, difficulty: LevelDifficulty): number {
  let n = 0;
  for (let i = 0; i < indexInChapter; i++) {
    if (difficultyForIndex(i) === difficulty) n += wordCountForDifficulty(difficulty);
  }
  // Chapter II of a theme continues the same deck where chapter I left off.
  if (baseTheme(themeIndex) !== themeIndex) {
    for (let i = 0; i < LEVELS_PER_CHAPTER; i++) {
      if (difficultyForIndex(i) === difficulty) n += wordCountForDifficulty(difficulty);
    }
  }
  return n;
}

export function getLevel(levelId: string): LevelData | undefined {
  const cached = wordCache.get(levelId);
  if (cached) return cached;

  const meta = META.get(levelId);
  if (!meta) return undefined;

  const theme = THEME_DATA[meta.themeIndex];
  const { difficulty } = meta;
  const wordCount = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : 10;

  const pool: string[] =
    (theme.words as Record<string, string[]>)[difficulty] ??
    (theme.words as Record<string, string[]>).easy;

  /*
   * Levels in a chapter walk through ONE shuffled deck of the pool instead of
   * each reshuffling it. Independently shuffled levels repeated words
   * constantly (30 levels drawing 6-10 words from ~100); now a word only comes
   * back once the deck has gone round. The deck is seeded per chapter and
   * difficulty, so every player gets the same boards.
   */
  const deck = chapterDeck(baseTheme(meta.themeIndex), difficulty, pool);
  const offset = wordsBefore(meta.themeIndex, meta.indexInChapter, difficulty);
  const take = (start: number, n: number) =>
    Array.from({ length: Math.min(n, deck.length) }, (_, i) => deck[(start + i) % deck.length]);

  const level: LevelData = {
    id: levelId,
    chapter: meta.chapter,
    difficulty,
    words: take(offset, wordCount),
    reserve: take(offset + wordCount, Math.min(30, Math.max(0, deck.length - wordCount))),
  };
  wordCache.set(levelId, level);
  return level;
}
