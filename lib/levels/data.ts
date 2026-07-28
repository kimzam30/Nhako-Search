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
// file — including the home screen, which only needs a chapter name — paid for
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

  // Seeded per level rather than per chapter. The old code advanced one PRNG
  // across a chapter's 30 levels, so level 30 could not be built without first
  // building levels 1-29 — which is what forced everything to be eager.
  const random = mulberry32((meta.themeIndex + 1) * 100003 + meta.indexInChapter * 7919);

  // Fisher-Yates. `sort(() => random() - 0.5)` is an inconsistent comparator,
  // so the word list depended on the engine's sort implementation and the same
  // level could show different words in different browsers.
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const level: LevelData = {
    id: levelId,
    chapter: meta.chapter,
    difficulty,
    words: shuffled.slice(0, Math.min(wordCount, shuffled.length)),
  };
  wordCache.set(levelId, level);
  return level;
}
