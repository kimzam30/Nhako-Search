export interface LevelData {
  id: string;
  chapter: string;
  difficulty: 'easy' | 'medium' | 'hard';
  words: string[];
}

export const CHAPTERS = [
  { id: 'c1', name: 'Garden', levels: ['c1-l1', 'c1-l2', 'c1-l3'] },
  { id: 'c2', name: 'Rainy Day', levels: ['c2-l1', 'c2-l2', 'c2-l3'] },
];

export const LEVELS: Record<string, LevelData> = {
  'c1-l1': { id: 'c1-l1', chapter: 'Garden', difficulty: 'easy', words: ['FLOWER', 'SEED', 'SOIL', 'SUN', 'ROOT', 'LEAF'] },
  'c1-l2': { id: 'c1-l2', chapter: 'Garden', difficulty: 'easy', words: ['PETAL', 'WATER', 'BLOOM', 'TREE', 'BUSH', 'VINE'] },
  'c1-l3': { id: 'c1-l3', chapter: 'Garden', difficulty: 'medium', words: ['BLOSSOM', 'GARDEN', 'SPROUT', 'BRANCH', 'TRUNK', 'STEM', 'WEED', 'FERN'] },
  'c2-l1': { id: 'c2-l1', chapter: 'Rainy Day', difficulty: 'medium', words: ['CLOUD', 'STORM', 'DROP', 'PUDDLE', 'SPLASH', 'UMBRELLA', 'BOOTS', 'COAT'] },
  'c2-l2': { id: 'c2-l2', chapter: 'Rainy Day', difficulty: 'medium', words: ['THUNDER', 'LIGHTNING', 'WIND', 'MIST', 'FOG', 'DAMP', 'WET', 'SOAK'] },
  'c2-l3': { id: 'c2-l3', chapter: 'Rainy Day', difficulty: 'hard', words: ['DRIZZLE', 'POUR', 'GUST', 'BREEZE', 'CHILL', 'GLOOM', 'GREY', 'DARK', 'OVERCAST', 'STORM'] },
};
