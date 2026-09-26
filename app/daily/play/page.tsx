'use client';
import { useEffect, useState } from 'react';
import { GameClient } from '@/components/game/GameClient';
import { dailyThemeIndex, gameDateString, gameDayLabel, getDailySeed } from '@/lib/daily/logic';
import { THEMES } from '@/lib/words/themes';
import { completeSolo } from '@/lib/rewards/complete';
import { BoardSkeleton } from '@/components/ui/Skeleton';
import { useSetGameTitle } from '@/lib/nav/gameTitle';

export default function DailyPlayPage() {
  // The seed is today's game day. This route is prerendered at build time, so
  // it must be read after mount — a render-time seed would be the build date's.
  const [day, setDay] = useState<{ seed: string; label: string; theme: (typeof THEMES)[number] } | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDay({
      seed: getDailySeed(),
      label: gameDayLabel(),
      theme: THEMES[dailyThemeIndex(gameDateString(), THEMES.length)],
    });
  }, []);

  useSetGameTitle(day ? `Daily · ${day.theme.name}` : 'Daily');

  const handleComplete = (r: { stars: number; seconds: number; hints: number; words: number }) =>
    completeSolo({ mode: 'daily', difficulty: 'medium', theme: day?.theme.id, ...r });

  if (!day) return <BoardSkeleton />;

  return (
    <div className="flex flex-col flex-1 items-center w-full px-3 pt-1 pb-2">
      <GameClient
        key={day.seed}
        words={day.theme.words.medium}
        difficulty="medium"
        seedStr={day.seed}
        onComplete={handleComplete}
        doneHref="/daily"
        doneLabel="See your streak"
      />
    </div>
  );
}
