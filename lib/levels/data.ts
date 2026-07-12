import gardenWords from '../words/garden.json';
import rainyDayWords from '../words/rainy-day.json';
import cozyCottageWords from '../words/cozy-cottage.json';
import nightSkyWords from '../words/night-sky.json';
import dateNightWords from '../words/date-night.json';
import standardWords from '../words/standard.json';

export interface LevelData {
  id: string;
  chapter: string;
  difficulty: 'easy' | 'medium' | 'hard';
  words: string[];
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

export const CHAPTERS: { id: string, name: string, levels: string[] }[] = [];
export const LEVELS: Record<string, LevelData> = {};

// Mulberry32 PRNG for deterministic generation
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

let levelIndexCounter = 1;

for (const theme of THEME_DATA) {
  const chapterLevels: string[] = [];
  // ~30 levels per chapter to get ~360 total
  const numLevels = 30;
  
  // Deterministic random based on chapter id
  const random = mulberry32(parseInt(theme.id.replace('c', '')) * 1000);
  
  for (let i = 0; i < numLevels; i++) {
    const levelId = `${theme.id}-l${levelIndexCounter}`;
    chapterLevels.push(levelId);
    
    // Difficulty ramp within chapter: 
    // First 10 easy, next 12 medium, last 8 hard
    let difficulty: 'easy' | 'medium' | 'hard' = 'easy';
    if (i >= 10 && i < 22) difficulty = 'medium';
    else if (i >= 22) difficulty = 'hard';
    
    // Select words based on difficulty
    const wordCount = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : 10;
    const pool = (theme.words as any)[difficulty] || (theme.words as any)['easy'];
    
    // Shuffle pool deterministically
    const shuffledPool = [...pool].sort(() => random() - 0.5);
    const selectedWords = shuffledPool.slice(0, Math.min(wordCount, shuffledPool.length));
    
    LEVELS[levelId] = {
      id: levelId,
      chapter: theme.name,
      difficulty,
      words: selectedWords
    };
    
    levelIndexCounter++;
  }
  
  CHAPTERS.push({
    id: theme.id,
    name: theme.name,
    levels: chapterLevels
  });
}
