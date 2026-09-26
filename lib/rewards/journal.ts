import { readJSON, writeJSON } from '@/lib/storage';

/*
 * A per-device diary of play events that the server does not record: how a
 * puzzle was solved rather than just that it was. Achievements read it for
 * the one-off feats (no hints, speed, night owl...). Once an achievement is
 * unlocked it is stored with the account, so the diary only has to be right
 * at the moment of the feat.
 */

export interface Journal {
  puzzles: number;
  freePlay: number;
  freeWords: number;
  noHintClears: number;
  /** Fastest clear per difficulty, seconds (including penalties). */
  best: Partial<Record<'easy' | 'medium' | 'hard', number>>;
  themes: string[];
  maxCombo: number;
  nightOwl: boolean;
  earlyBird: boolean;
  together: number;
  hintsBought: number;
}

const KEY = 'nhako_journal';

const EMPTY: Journal = {
  puzzles: 0,
  freePlay: 0,
  freeWords: 0,
  noHintClears: 0,
  best: {},
  themes: [],
  maxCombo: 0,
  nightOwl: false,
  earlyBird: false,
  together: 0,
  hintsBought: 0,
};

export function readJournal(): Journal {
  const j = readJSON<Partial<Journal>>(KEY, {});
  return {
    ...EMPTY,
    ...j,
    best: { ...(j.best ?? {}) },
    themes: Array.isArray(j.themes) ? j.themes : [],
  };
}

export function updateJournal(update: (j: Journal) => void): Journal {
  const j = readJournal();
  update(j);
  writeJSON(KEY, j);
  return j;
}

export interface ClearEvent {
  difficulty: 'easy' | 'medium' | 'hard';
  seconds: number;
  hints: number;
  words: number;
  theme?: string;
  freePlay?: boolean;
}

export function recordClear(e: ClearEvent): Journal {
  const hour = new Date().getHours();
  return updateJournal(j => {
    j.puzzles++;
    if (e.freePlay) {
      j.freePlay++;
      j.freeWords += e.words;
    }
    if (e.hints === 0) j.noHintClears++;
    const prev = j.best[e.difficulty];
    if (prev === undefined || e.seconds < prev) j.best[e.difficulty] = e.seconds;
    if (e.theme && !j.themes.includes(e.theme)) j.themes.push(e.theme);
    if (hour >= 0 && hour < 4) j.nightOwl = true;
    if (hour >= 5 && hour < 7) j.earlyBird = true;
  });
}

export function recordCombo(level: number) {
  const j = readJournal();
  if (level > j.maxCombo) updateJournal(x => void (x.maxCombo = level));
}
