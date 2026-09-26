'use client';
import { GameClient } from '@/components/game/GameClient';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Difficulty } from '@/lib/puzzle/generator';
import { useSetGameTitle } from '@/lib/nav/gameTitle';
import { THEME_BY_ID } from '@/lib/words/themes';
import { bucketFor, pickFresh, wordCountFor } from '@/lib/words/pick';
import { completeSolo } from '@/lib/rewards/complete';
import { BoardSkeleton } from '@/components/ui/Skeleton';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

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
  const theme = THEME_BY_ID.has(rawTheme) ? rawTheme : 'standard';
  const diff: Difficulty = DIFFICULTIES.includes(rawDiff as Difficulty) ? (rawDiff as Difficulty) : 'easy';
  const canonical = rawTheme === theme && rawDiff === diff;

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const themeName = THEME_BY_ID.get(theme)!.name;
  useSetGameTitle(`${themeName} · ${diff.charAt(0).toUpperCase()}${diff.slice(1)}`);

  // Words this device has not seen lately come first (lib/words/pick.ts), so
  // "New puzzle" keeps feeling new game after game, across app restarts.
  const generateNew = useCallback(() => {
    const pool = THEME_BY_ID.get(theme)!.words[diff];
    const { words, reserve } = pickFresh(bucketFor(theme, diff), pool, wordCountFor(diff));
    setPuzzle({ seed: Math.random().toString(36).substring(2), words, reserve });
  }, [theme, diff]);

  const handleComplete = useCallback(
    (r: { stars: number; seconds: number; hints: number; words: number }) =>
      completeSolo({ mode: 'free', difficulty: diff, theme, ...r }),
    [diff, theme]
  );

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

  if (!puzzle) return <BoardSkeleton />;

  return (
    <div className="flex flex-col flex-1 px-3 pt-1 pb-2 items-center w-full">
      {/* key remounts the game so a new seed actually regenerates the grid:
          useGameLogic builds it in a useState initialiser, which only runs on mount. */}
      <GameClient
        key={puzzle.seed}
        words={puzzle.words}
        reserveWords={puzzle.reserve}
        difficulty={diff}
        seedStr={puzzle.seed}
        onNext={generateNew}
        onComplete={handleComplete}
      />
    </div>
  );
}
