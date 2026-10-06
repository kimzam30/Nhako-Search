/**
 * The NhakoSearch icon, drawn in the NeraOS pixel language of the Nhako Tools
 * icon: an open book on a lawn, slanted a little, with one word circled in a
 * pink capsule like a found word on the board, a ribbon bookmark, and the
 * butterfly from the old icon perched on the raised corner.
 *
 * Same format and rules as Nhako Tools' scripts/logo-art.mjs: one string per
 * pixel row, one letter per pixel, every letter a key into PALETTE; a 1px plum
 * outline, flat fills, a shade row along the bottom, flowers in the corners.
 *
 * The slant is a column shear (each run of seven columns sits one row higher
 * than the last), so every edge stays a clean pixel step; the butterfly is
 * placed unsheared, since skewing a 9px sprite turns it into a blob. The rows
 * below are the frozen result: edit them by hand, then `npm run icons`.
 */

export const PALETTE = {
  O: '#4a3a5c', // outline (NeraOS plum, never black)
  W: '#ffffff', // paper
  w: '#f6eefb', // paper, shade row
  L: '#c9b8e8', // lines of text
  A: '#f7a1c4', // wing pink, the word capsule
  B: '#c3a6f0', // wing lavender
  P: '#f49ac1', // pink petals
  Y: '#ffd98a', // flower centres
  C: '#ff8fbf', // the cover
  c: '#d9669c', // the cover, shade
  H: '#ffc2dc', // the cover's glint
  R: '#e8505b', // the ribbon
  Q: '#b83a4b', // the ribbon, shade
  G: '#8fcf9e', // the lawn
  g: '#6bb784', // grass blade
  h: '#b5e3be', // grass, lit
  s: '#76b98c', // the book's shadow on the lawn
  e: '#b893ea', // lilac petals
  f: '#f7b8d4', // blush petals
};

export const ICON = [
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGhGGGGGGGGgGgGGGGOGOGGGGGGG',
  'GGgGgGGGGGGGGGGGgGGGGOOOOOOOGGGG',
  'GGGgGGGGGGGGGGGGGGGGOAAAOAAAOGGG',
  'GGGGPGGGGgGgGGGGGGGGOAWAOAWAOhGG',
  'GGGPYPGGGGgGeGGGGGhGGOAAOAAOGGGG',
  'GGGGPGGGGGGeYeGGGGGGGOBBOBBOGGGG',
  'GGGGGGGGGGGGeGGGGGGGOBBBOBBBOGGG',
  'GhGGGGGGGGGGGGGGGGGGGOOOGOOOGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGOOOOOOGgGg',
  'GGGGGGGGGGGGGGGOOOOOOOWWWWWWOGgG',
  'GGGGGGGGOOOOOOOOWWWWWWWWWWWWOGGG',
  'GGGOOOOOWWWWWWWOWWWWWWLLLLLWOGhG',
  'GGOWWWWWWWWWWWWOWLLLLLWWWWWWOGGG',
  'GgOWWWWWLLLLLWWOWWWWWWLLWWWWOGGG',
  'GGOWLLLLWWWWWWWOWLLLLLWWWWWWOGGG',
  'GGOWWWWWWWWWWWWOWWWWWWLLLLLWOGGG',
  'GGOWLLLLWOOOOOWOWLLLLLWWWWWWOGgG',
  'GGOWWWWWOAWAAAOOWWWWWWLLLWWWOGGg',
  'GGOWLLLLOAAAAAOOWLLLLLWWWWWWOGGG',
  'GGOWWWWWWOOOOOWOWWWWWWwwwwwwOGGG',
  'GGOWWWWWLLLLWWWOwwwwwwOOOOOOOGGG',
  'GGOWLLLLwwwwwwwOOOOOOOCCCCCCOGGG',
  'GGOwwwwwOOOOOOOOCCCCCCccccccOGGG',
  'GGOOOOOOCCCCCCCOccccccOOOOOOGsGG',
  'GGOHCCCCcccccccOOOOOOOOGsssssgGG',
  'GGOcccccOOOOOOOGsssORROGGGGGgGGG',
  'GGGOOOOOGsssssssGGGORQOGGGGPGGGG',
  'GGfYfssssGGGGGGGGGGOROgsGGPYPGGG',
  'GGGfGGGGGGGgGgGGGGGOOgsGGGGPGGGG',
  'GGhGGGGGGGGGghGGGGGGssGGhGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
];

/**
 * ICON centred on a bigger lawn, for the platforms that crop. `dy` moves the
 * art down that many cells. The extra lawn is scattered from a fixed seed, so
 * every build writes the same pixels.
 */
export function onLawn(size, { dy = 0, seed = 7 } = {}) {
  const off = (size - ICON.length) / 2;
  if (!Number.isInteger(off)) throw new Error(`onLawn: ${size} does not centre a ${ICON.length}px icon`);
  const grid = Array.from({ length: size }, () => Array(size).fill('G'));
  let s = seed;
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const inIcon = (x, y) => x >= off && x < off + ICON.length && y >= off + dy && y < off + dy + ICON.length;
  const put = (x, y, k) => {
    if (x >= 0 && y >= 0 && x < size && y < size && !inIcon(x, y)) grid[y][x] = k;
  };
  const cells = size * size - ICON.length ** 2;
  for (let i = 0; i < cells * 0.04; i++) {
    const x = Math.floor(rand() * size), y = Math.floor(rand() * size);
    put(x, y, 'g'); put(x + 2, y, 'g'); put(x + 1, y + 1, 'g');
  }
  for (let i = 0; i < cells * 0.028; i++) put(Math.floor(rand() * size), Math.floor(rand() * size), 'h');
  for (let i = 0; i < cells * 0.004; i++) {
    const x = Math.floor(rand() * (size - 2)), y = Math.floor(rand() * (size - 2));
    const petal = ['P', 'e', 'f'][Math.floor(rand() * 3)];
    put(x + 1, y, petal); put(x, y + 1, petal); put(x + 1, y + 1, 'Y'); put(x + 2, y + 1, petal); put(x + 1, y + 2, petal);
  }
  ICON.forEach((row, y) => [...row].forEach((k, x) => (grid[y + off + dy][x + off] = k)));
  return grid.map(r => r.join(''));
}

/** Stepped rounded corners, the pixel-art way: two cells off the edge, then one. */
export function rounded(rows) {
  const n = rows.length;
  const cut = new Set(['0,0', '1,0', '0,1']);
  return rows.map((row, y) =>
    [...row]
      .map((k, x) => {
        const cx = x < n / 2 ? x : n - 1 - x;
        const cy = y < n / 2 ? y : n - 1 - y;
        return cut.has(`${cx},${cy}`) ? '.' : k;
      })
      .join(''),
  );
}
