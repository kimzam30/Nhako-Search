'use client';
import { useEffect, useState } from 'react';
import { GameClient } from '@/components/game/GameClient';
import { gameDayLabel, getDailySeed, saveDailyChallenge } from '@/lib/daily/logic';
import standardPool from '@/lib/words/standard.json';
import { useSetGameTitle } from '@/lib/nav/gameTitle';

export default function DailyPlayPage() {
  // The seed is today's game day. This route is prerendered at build time, so
  // it must be read after mount — a render-time seed would be the build date's.
  const [day, setDay] = useState<{ seed: string; label: string } | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDay({ seed: getDailySeed(), label: gameDayLabel() });
  }, []);

  useSetGameTitle(day ? `Daily · ${day.label}` : 'Daily');

  const handleComplete = async (stars: number) => {
    await saveDailyChallenge(stars);
  };

  if (!day) return null;

  return (
    <div className="flex flex-col flex-1 items-center w-full px-3 pt-1 pb-2">
      <GameClient
        key={day.seed}
        words={standardPool.medium}
        difficulty="medium"
        seedStr={day.seed}
        onComplete={handleComplete}
        doneHref="/daily"
        doneLabel="See your streak"
      />
    </div>
  );
}
