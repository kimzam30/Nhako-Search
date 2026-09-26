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

/**
 * `reserve` words are only used to backfill when a first-choice word cannot be
 * placed or clashes with another; they never change a puzzle that did not need
 * them, so existing level boards stay identical.
 */
export function generateGrid(
  words: string[],
  difficulty: Difficulty,
  seedStr: string,
  reserve: string[] = []
): Grid {
  const seedNum = cyrb128(seedStr)[0];
  const random = mulberry32(seedNum);

  let width = 8, height = 8;
  // Unknown difficulties (e.g. a hand-edited URL) fall back to easy rather
  // than leaving `directions` empty, which crashed the page.
  let directions: [number, number][] = [[1, 0], [0, 1]];

  if (difficulty === 'medium') {
    width = 10; height = 10;
    directions = [[1, 0], [0, 1], [1, 1], [-1, 1]];
  } else if (difficulty === 'hard') {
    width = 13; height = 13;
    directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [-1, 1], [1, -1]];
  }

  // Pick exactly the words we need based on difficulty max
  const wordCount = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : 10;

  // Only consider words that can physically fit. A word longer than the grid
  // can never be placed, and the placement loop drops such words silently:
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
  // inconsistent, so the result depended on the engine's sort algorithm:
  // the same seed produced different grids in different browsers, which
  // desynced the two players in a race.
  const shuffledWords = [...eligible];
  for (let i = shuffledWords.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffledWords[i], shuffledWords[j]] = [shuffledWords[j], shuffledWords[i]];
  }

  // Never put two words in one puzzle where one contains the other (RAIN and
  // DRAIN, READ and BREAD): finding the short one inside the long one counted
  // as a find, and the highlight landed somewhere else.
  const reversed = (w: string) => [...w].reverse().join('');
  const clashes = (a: string, b: string) =>
    a.includes(b) || b.includes(a) || a.includes(reversed(b)) || b.includes(reversed(a));
  const chosen: string[] = [];
  const reserveWords: string[] = [];
  for (const w of shuffledWords) {
    if (chosen.length < wordCount && !chosen.some(c => clashes(c, w))) chosen.push(w);
    else reserveWords.push(w);
  }
  // Sort by length descending for easier placement
  const cleanWords = chosen.sort((a, b) => b.length - a.length);
  const normalise = (w: string) => w.toUpperCase().replace(/[^A-Z]/g, '');
  for (const w of reserve.map(normalise)) {
    if (w.length >= 3 && w.length <= maxLength && !eligible.includes(w) && !reserveWords.includes(w)) {
      reserveWords.push(w);
    }
  }

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
    if (placedWords.some(pw => clashes(pw.word, word))) continue;
    tryPlaceWord(word);
  }

  // Fill remainder
  const isFiller: boolean[][] = grid.map(row => row.map(c => c === ''));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isFiller[y][x]) grid[y][x] = ALPHABET[Math.floor(random() * ALPHABET.length)];
    }
  }

  // Random filler can spell a placed word a second time. That decoy used to
  // count as a find (14 of the 360 levels had one), so re-roll a filler letter
  // inside every extra occurrence until each word appears exactly once.
  const ALL_DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [-1, 1], [1, -1]];
  for (let pass = 0; pass < 50; pass++) {
    let changed = false;
    for (const pw of placedWords) {
      const L = pw.word.length;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          for (const [dx, dy] of ALL_DIRS) {
            const ex = x + dx * (L - 1);
            const ey = y + dy * (L - 1);
            if (ex < 0 || ey < 0 || ex >= width || ey >= height) continue;
            const own =
              (x === pw.startX && y === pw.startY && ex === pw.endX && ey === pw.endY) ||
              (x === pw.endX && y === pw.endY && ex === pw.startX && ey === pw.startY);
            if (own) continue;
            let match = true;
            const filler: [number, number][] = [];
            for (let i = 0; i < L; i++) {
              const cx = x + dx * i;
              const cy = y + dy * i;
              if (grid[cy][cx] !== pw.word[i]) { match = false; break; }
              if (isFiller[cy][cx]) filler.push([cx, cy]);
            }
            if (!match || filler.length === 0) continue;
            const [fx, fy] = filler[Math.floor(random() * filler.length)];
            const current = grid[fy][fx];
            let next = current;
            while (next === current) next = ALPHABET[Math.floor(random() * ALPHABET.length)];
            grid[fy][fx] = next;
            changed = true;
          }
        }
      }
    }
    if (!changed) break;
  }

  const cells: GridCell[][] = grid.map((row, y) => row.map((letter, x) => ({ letter, x, y })));

  return { width, height, cells, placedWords };
}
