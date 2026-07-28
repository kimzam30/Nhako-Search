'use client';

import { useParams } from 'next/navigation';
import { getLevel, ALL_LEVEL_IDS } from '@/lib/levels/data';
import { GameClient } from '@/components/game/GameClient';
import { saveLevelProgress } from '@/lib/levels/progress';

export default function LevelGameplayPage() {
  const params = useParams();
  const levelId = params.levelId as string;
  // Words for this one level are generated on demand, not for all 360 at import.
  const level = getLevel(levelId);

  const levelIndex = ALL_LEVEL_IDS.indexOf(levelId);
  const nextLevelId =
    levelIndex >= 0 && levelIndex < ALL_LEVEL_IDS.length - 1 ? ALL_LEVEL_IDS[levelIndex + 1] : null;

  if (!level) return <div className="p-4">Level not found</div>;

  const handleComplete = async (stars: number, timeSeconds: number) => {
    await saveLevelProgress(levelId, stars, timeSeconds);
  };

  return (
    <div className="flex flex-col flex-1 p-4 bg-background items-center justify-center">
      <div className="w-full flex justify-between items-center mb-6 max-w-lg">
        <h1 className="text-2xl font-display text-ink">{level.chapter} - Level {levelId.split('-l')[1]}</h1>
      </div>
      {/* "Next Level" routes to the same [levelId] page, so React reuses this
          component tree. Without a key the grid stays on the previous level. */}
      <GameClient
        key={levelId}
        words={level.words}
        difficulty={level.difficulty}
        seedStr={levelId}
        onComplete={handleComplete}
        nextLevelHref={nextLevelId ? `/level-path/${nextLevelId}` : '/level-path'}
      />
    </div>
  );
}
