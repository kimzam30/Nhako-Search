export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GridCell {
  letter: string;
  x: number;
  y: number;
}

export interface PlacedWord {
  word: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface Grid {
  width: number;
  height: number;
  cells: GridCell[][];
  placedWords: PlacedWord[];
}

// Seeded PRNG (Mulberry32)
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Convert string seed to numeric seed
function cyrb128(str: string) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1^h2^h3^h4)>>>0];
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function generateGrid(words: string[], difficulty: Difficulty, seedStr: string): Grid {
  const seedNum = cyrb128(seedStr)[0];
  const random = mulberry32(seedNum);

  let width = 8, height = 8;
  let directions: [number, number][] = [];

  if (difficulty === 'easy') {
    width = 8; height = 8;
    directions = [[1, 0], [0, 1]];
  } else if (difficulty === 'medium') {
    width = 10; height = 10;
    directions = [[1, 0], [0, 1], [1, 1], [-1, 1]];
  } else if (difficulty === 'hard') {
    width = 13; height = 13;
    directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [-1, 1], [1, -1]];
  }

  // Pick exactly the words we need based on difficulty max
  const wordCount = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : 10;

  // Only consider words that can physically fit. A word longer than the grid
  // can never be placed, and the placement loop drops such words silently —
  // e.g. BUTTERFLY (9) in race easy mode (8x8) failed 100% of the time.
  const maxLength = Math.min(width, height);
  const eligible = Array.from(
    new Set(
      words
        .map(w => w.toUpperCase().replace(/[^A-Z]/g, ''))
        .filter(w => w.length >= 3 && w.length <= maxLength)
    )
  );

  // Fisher-Yates, not `sort(() => random() - 0.5)`. That comparator is
  // inconsistent, so the result depended on the engine's sort algorithm —
  // the same seed produced different grids in different browsers, which
  // desynced the two players in a race.
  const shuffledWords = [...eligible];
  for (let i = shuffledWords.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffledWords[i], shuffledWords[j]] = [shuffledWords[j], shuffledWords[i]];
  }

  // Sort by length descending for easier placement
  const cleanWords = shuffledWords
    .slice(0, Math.min(wordCount, shuffledWords.length))
    .sort((a, b) => b.length - a.length);
  // Spares used to backfill if a first-choice word cannot be placed, so the
  // puzzle still offers the expected number of words.
  const reserveWords = shuffledWords.slice(wordCount);

  const grid: string[][] = Array(height).fill(null).map(() => Array(width).fill(''));
  const placedWords: PlacedWord[] = [];

  const tryPlaceWord = (word: string) => {
    let placed = false;
    let attempts = 0;
    
    // For hard mode, we evaluate multiple valid placements and pick the one with most overlaps
    let bestPlacement: { dir: number[], startX: number, startY: number, overlaps: number } | null = null;
    
    while (!placed && attempts < (difficulty === 'hard' ? 200 : 100)) {
      const dir = directions[Math.floor(random() * directions.length)];
      const startX = Math.floor(random() * width);
      const startY = Math.floor(random() * height);
      const endX = startX + dir[0] * (word.length - 1);
      const endY = startY + dir[1] * (word.length - 1);

      if (endX >= 0 && endX < width && endY >= 0 && endY < height) {
        let fits = true;
        let overlaps = 0;
        
        for (let i = 0; i < word.length; i++) {
          const cx = startX + dir[0] * i;
          const cy = startY + dir[1] * i;
          
          if (difficulty === 'easy') {
            if (grid[cy][cx] !== '') {
              fits = false;
              break;
            }
          } else {
            if (grid[cy][cx] !== '') {
              if (grid[cy][cx] !== word[i]) {
                fits = false;
                break;
              } else {
                overlaps++;
              }
            }
          }
        }

        if (fits) {
          if (difficulty === 'hard') {
            if (!bestPlacement || overlaps > bestPlacement.overlaps) {
              bestPlacement = { dir, startX, startY, overlaps };
            }
            // If we found a really good overlap, stop searching early
            if (overlaps >= 2) break;
          } else {
            bestPlacement = { dir, startX, startY, overlaps };
            break;
          }
        }
      }
      attempts++;
    }

    if (bestPlacement) {
      const { dir, startX, startY } = bestPlacement;
      const endX = startX + dir[0] * (word.length - 1);
      const endY = startY + dir[1] * (word.length - 1);

      for (let i = 0; i < word.length; i++) {
        const cx = startX + dir[0] * i;
        const cy = startY + dir[1] * i;
        grid[cy][cx] = word[i];
      }
      
      placedWords.push({
        word,
        startX,
        startY,
        endX,
        endY
      });
      placed = true;
    }
    return placed;
  };

  for (const word of cleanWords) {
    tryPlaceWord(word);
  }

  // A word can still fail to place if the grid got congested. Backfill from the
  // spares so the player reliably gets `wordCount` words rather than silently
  // fewer, which previously capped the race progress bar below 100%.
  for (const word of reserveWords) {
    if (placedWords.length >= wordCount) break;
    tryPlaceWord(word);
  }

  // Fill remainder
  const cells: GridCell[][] = [];
  for (let y = 0; y < height; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === '') {
        const randLetter = ALPHABET[Math.floor(random() * ALPHABET.length)];
        row.push({ letter: randLetter, x, y });
      } else {
        row.push({ letter: grid[y][x], x, y });
      }
    }
    cells.push(row);
  }

  return { width, height, cells, placedWords };
}
