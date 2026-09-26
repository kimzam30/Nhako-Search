/*
 * Butterfly species: the design recipe behind every butterfly in the album.
 *
 * Six wing silhouettes x nine wing patterns x colour triples x tail x antenna
 * style. Achievement butterflies are hand-picked recipes (no two share one —
 * see tests/species.spec.ts); keepsakes (daily stamps, co-op clears) are
 * derived from their id, so each day's butterfly is its own design and the
 * same day always draws the same one.
 */

export type WingShape = 0 | 1 | 2 | 3 | 4 | 5;
export type WingPattern = 'plain' | 'spots' | 'eyes' | 'bands' | 'veins' | 'dots' | 'marble' | 'stripes' | 'tips';
export type Antenna = 'club' | 'curl' | 'feather';

export interface SpeciesSpec {
  shape: WingShape;
  pattern: WingPattern;
  /** [upper wing, lower wing, pattern accent] — CSS colours or tokens. */
  colors: [string, string, string];
  tail?: boolean;
  antenna?: Antenna;
}

/** Wing fills: the capsule palette, so both themes stay colourful. */
export const WING = {
  pink: 'var(--word-1)',
  lav: 'var(--word-2)',
  mint: 'var(--word-3)',
  butter: 'var(--word-4)',
  sky: 'var(--word-5)',
  peach: 'var(--word-6)',
  orchid: 'var(--word-7)',
  lime: 'var(--word-8)',
  gold: 'var(--gold)',
  rose: 'var(--accent)',
  cream: 'var(--art-light)',
  ink: 'var(--line)',
} as const;

const FILLS = [WING.pink, WING.lav, WING.mint, WING.butter, WING.sky, WING.peach, WING.orchid, WING.lime, WING.gold, WING.rose];
const ACCENTS = [WING.cream, WING.ink, WING.gold, WING.butter, WING.lav, WING.pink];
const PATTERNS: WingPattern[] = ['plain', 'spots', 'eyes', 'bands', 'veins', 'dots', 'marble', 'stripes', 'tips'];
const ANTENNAE: Antenna[] = ['club', 'curl', 'feather'];

export function speciesKey(s: SpeciesSpec): string {
  return [s.shape, s.pattern, ...s.colors, s.tail ? 't' : '-', s.antenna ?? 'club'].join('|');
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A deterministic, varied recipe for a keepsake id. */
export function seededSpecies(id: string): SpeciesSpec {
  let h = hash(id);
  const pick = <T,>(list: readonly T[]) => {
    const v = list[h % list.length];
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
    return v;
  };
  const shape = pick([0, 1, 2, 3, 4, 5] as const);
  const pattern = pick(PATTERNS);
  const upper = pick(FILLS);
  let lower = pick(FILLS);
  if (lower === upper) lower = FILLS[(FILLS.indexOf(upper) + 3) % FILLS.length];
  const accent = pick(ACCENTS);
  return { shape, pattern, colors: [upper, lower, accent], tail: shape === 1 || pick([false, false, true]), antenna: pick(ANTENNAE) };
}
