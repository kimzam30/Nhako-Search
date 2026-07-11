'use client';

import { useParams, useRouter } from 'next/navigation';
import { LEVELS, CHAPTERS } from '@/lib/levels/data';
import { GameClient } from '@/components/game/GameClient';
import { saveLevelProgress } from '@/lib/levels/progress';
import { useMemo } from 'react';

export default function LevelGameplayPage() {
  const params = useParams();
  const levelId = params.levelId as string;
  const level = LEVELS[levelId];
  
  const flatLevels = useMemo(() => CHAPTERS.flatMap(c => c.levels), []);
  const levelIndex = flatLevels.indexOf(levelId);
  const nextLevelId = levelIndex >= 0 && levelIndex < flatLevels.length - 1 ? flatLevels[levelIndex + 1] : null;

  if (!level) return <div className="p-4">Level not found</div>;

  const handleComplete = async (stars: number, timeSeconds: number) => {
    await saveLevelProgress(levelId, stars, timeSeconds);
  };

  return (
    <div className="flex flex-col flex-1 p-4 bg-background items-center justify-center">
      <div className="w-full flex justify-between items-center mb-6 max-w-lg">
        <h1 className="text-2xl font-display text-ink">{level.chapter} - Level {levelId.split('-l')[1]}</h1>
      </div>
      <GameClient 
        words={level.words} 
        difficulty={level.difficulty} 
        seedStr={levelId}
        onComplete={handleComplete}
        nextLevelHref={nextLevelId ? `/level-path/${nextLevelId}` : '/level-path'}
      />
    </div>
  );
}
