import standard from './standard.json';
import garden from './garden.json';
import rainyDay from './rainy-day.json';
import cozyCottage from './cozy-cottage.json';
import nightSky from './night-sky.json';
import dateNight from './date-night.json';
import ocean from './ocean.json';
import bakery from './bakery.json';
import woodland from './woodland.json';
import travel from './travel.json';
import music from './music.json';
import seasons from './seasons.json';
import type { Difficulty } from '@/lib/puzzle/generator';

export type WordPool = Record<Difficulty, string[]>;

export interface Theme {
  id: string;
  name: string;
  /** Capsule colour the theme card is tinted with. */
  hue: string;
  words: WordPool;
}

/** Every free-play theme, in the order the picker shows them. */
export const THEMES: Theme[] = [
  { id: 'standard', name: 'Mixed pack', hue: 'var(--word-2)', words: standard },
  { id: 'garden', name: 'Garden', hue: 'var(--word-3)', words: garden },
  { id: 'rainy-day', name: 'Rainy day', hue: 'var(--word-5)', words: rainyDay },
  { id: 'cozy-cottage', name: 'Cozy cottage', hue: 'var(--word-6)', words: cozyCottage },
  { id: 'night-sky', name: 'Night sky', hue: 'var(--word-2)', words: nightSky },
  { id: 'date-night', name: 'Date night', hue: 'var(--word-1)', words: dateNight },
  { id: 'ocean', name: 'Seaside', hue: 'var(--word-5)', words: ocean },
  { id: 'bakery', name: 'Bakery', hue: 'var(--word-4)', words: bakery },
  { id: 'woodland', name: 'Woodland', hue: 'var(--word-8)', words: woodland },
  { id: 'travel', name: 'Travel', hue: 'var(--word-6)', words: travel },
  { id: 'music', name: 'Music', hue: 'var(--word-7)', words: music },
  { id: 'seasons', name: 'Seasons', hue: 'var(--word-3)', words: seasons },
];

export const FREE_PLAY_THEME_IDS = THEMES.map(t => t.id);

export const THEME_BY_ID = new Map(THEMES.map(t => [t.id, t]));

export function themeOrDefault(id: string | undefined): Theme {
  return (id && THEME_BY_ID.get(id)) || THEMES[0];
}
