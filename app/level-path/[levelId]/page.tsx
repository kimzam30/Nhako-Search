'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getLevel, getLevelMeta, ALL_LEVEL_IDS } from '@/lib/levels/data';
import { GameClient } from '@/components/game/GameClient';
import { loadLevelProgress, saveLevelProgress } from '@/lib/levels/progress';
import { ButtonLink } from '@/components/ui/Button';
import { LockSvg } from '@/components/ui/Icons';
import { useSetGameTitle } from '@/lib/nav/gameTitle';

export default function LevelGameplayPage() {
  const params = useParams();
  const levelId = params.levelId as string;
  // Words for this one level are generated on demand, not for all 360 at import.
  const level = getLevel(levelId);
  const meta = getLevelMeta(levelId);

  const levelIndex = ALL_LEVEL_IDS.indexOf(levelId);
  const nextLevelId =
    levelIndex >= 0 && levelIndex < ALL_LEVEL_IDS.length - 1 ? ALL_LEVEL_IDS[levelIndex + 1] : null;

  useSetGameTitle(meta ? `${meta.chapter} · Level ${meta.numberInChapter}` : '');

  // Locks used to exist only on the map; any level opened straight from its
  // URL. Level 1 is always open; every other level needs the previous one done.
  const [unlocked, setUnlocked] = useState<boolean | null>(levelIndex === 0 ? true : null);
  useEffect(() => {
    if (levelIndex <= 0) return;
    let cancelled = false;
    loadLevelProgress().then(rows => {
      const prev = ALL_LEVEL_IDS[levelIndex - 1];
      if (!cancelled) setUnlocked(rows.some(r => r.level_id === prev && (r.stars ?? 0) > 0));
    });
    return () => {
      cancelled = true;
    };
  }, [levelIndex]);

  if (!level || !meta) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-6 p-6 text-center">
        <h1 className="text-3xl font-display text-ink">Level not found</h1>
        <ButtonLink href="/level-path" replace>Back to the map</ButtonLink>
      </div>
    );
  }

  if (unlocked === null) return null;

  if (!unlocked) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-5 p-6 text-center max-w-sm mx-auto">
        <LockSvg className="w-12 h-12 text-ink-2" />
        <h1 className="text-3xl font-display text-ink">Level {meta.numberInChapter} is locked</h1>
        <p className="font-body font-bold text-ink-2">Finish the level before it to open this one.</p>
        <ButtonLink href="/level-path" replace fullWidth>Back to the map</ButtonLink>
      </div>
    );
  }

  const handleComplete = async (stars: number, timeSeconds: number) => {
    await saveLevelProgress(levelId, stars, timeSeconds);
  };

  return (
    <div className="flex flex-col flex-1 px-3 pt-1 pb-4 items-center w-full">
      {/* "Next Level" routes to the same [levelId] page, so React reuses this
          component tree. Without a key the grid stays on the previous level. */}
      <GameClient
        key={levelId}
        words={level.words}
        reserveWords={level.reserve}
        difficulty={level.difficulty}
        seedStr={levelId}
        onComplete={handleComplete}
        nextLevelHref={nextLevelId ? `/level-path/${nextLevelId}` : '/level-path'}
      />
    </div>
  );
}
