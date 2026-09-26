'use client';
import { GameClient } from '@/components/game/GameClient';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import standardWords from '@/lib/words/standard.json';
import gardenWords from '@/lib/words/garden.json';
import rainyDayWords from '@/lib/words/rainy-day.json';
import cozyCottageWords from '@/lib/words/cozy-cottage.json';
import nightSkyWords from '@/lib/words/night-sky.json';
import dateNightWords from '@/lib/words/date-night.json';
import type { Difficulty } from '@/lib/puzzle/generator';
import { useSetGameTitle } from '@/lib/nav/gameTitle';

type WordPool = Record<Difficulty, string[]>;

const THEME_MAP: Record<string, WordPool> = {
  'standard': standardWords,
  'garden': gardenWords,
  'rainy-day': rainyDayWords,
  'cozy-cottage': cozyCottageWords,
  'night-sky': nightSkyWords,
  'date-night': dateNightWords
};

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Fisher-Yates. `sort(() => 0.5 - Math.random())` is biased. */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface Puzzle {
  seed: string;
  words: string[];
  reserve: string[];
}

export default function StandardPlayPage() {
  const params = useParams();
  const router = useRouter();
  const rawTheme = (params.slug?.[0] as string) || 'standard';
  const rawDiff = params.slug?.[1] as string | undefined;

  // The URL is user-editable. An unknown difficulty used to reach the
  // generator unchecked and crash the page.
  const theme = rawTheme in THEME_MAP ? rawTheme : 'standard';
  const diff: Difficulty = DIFFICULTIES.includes(rawDiff as Difficulty) ? (rawDiff as Difficulty) : 'easy';
  const canonical = rawTheme === theme && rawDiff === diff;

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const themeLabel = theme.replace('-', ' ');
  useSetGameTitle(`${themeLabel.charAt(0).toUpperCase()}${themeLabel.slice(1)} · ${diff.charAt(0).toUpperCase()}${diff.slice(1)}`);

  const generateNew = useCallback(() => {
    const wordCount = diff === 'easy' ? 6 : diff === 'medium' ? 8 : 10;
    const pool = THEME_MAP[theme][diff];
    const recentKey = `nhako_recent_${theme}_${diff}`;

    let recentWords: string[] = [];
    try {
      const parsed = JSON.parse(sessionStorage.getItem(recentKey) || '[]');
      if (Array.isArray(parsed)) recentWords = parsed;
    } catch {
      /* corrupt or unavailable — start fresh */
    }

    // Prefer words not seen recently; fall back to the whole pool if exhausted.
    const available = pool.filter(w => !recentWords.includes(w));
    const shuffled = shuffle(available.length >= wordCount ? available : pool);
    const selected = shuffled.slice(0, wordCount);

    try {
      sessionStorage.setItem(recentKey, JSON.stringify([...recentWords, ...selected].slice(-30)));
    } catch {
      /* private mode */
    }

    setPuzzle({
      seed: Math.random().toString(36).substring(2),
      words: selected,
      reserve: shuffled.slice(wordCount),
    });
  }, [theme, diff]);

  useEffect(() => {
    if (!canonical) {
      router.replace(`/play/standard/${theme}/${diff}`);
      return;
    }
    // sessionStorage and Math.random are client-only, so the puzzle is built
    // after hydration rather than during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    generateNew();
  }, [canonical, theme, diff, router, generateNew]);

  if (!puzzle) return null;

  return (
    <div className="flex flex-col flex-1 px-3 pt-1 pb-2 items-center w-full">
      {/* key remounts the game so a new seed actually regenerates the grid —
          useGameLogic builds it in a useState initialiser, which only runs on mount. */}
      <GameClient
        key={puzzle.seed}
        words={puzzle.words}
        reserveWords={puzzle.reserve}
        difficulty={diff}
        seedStr={puzzle.seed}
        onNext={generateNew}
      />
    </div>
  );
}
