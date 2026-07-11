'use client';
import { motion } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import { CHAPTERS, LEVELS } from '@/lib/levels/data';
import { loadLevelProgress } from '@/lib/levels/progress';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StarSvg } from '@/components/ui/Icons';

export default function LevelPathPage() {
  const [progress, setProgress] = useState<any[]>([]);

  useEffect(() => {
    loadLevelProgress().then(setProgress);
  }, []);

  const getStars = (levelId: string) => {
    const p = progress.find(p => p.level_id === levelId);
    return p ? p.stars : 0;
  };

  const flatLevels = CHAPTERS.flatMap(c => c.levels);

  return (
    <div className="flex flex-col items-center flex-1 p-4 bg-background w-full max-w-lg mx-auto pb-10">
      <h1 className="text-3xl font-display text-ink mb-6">Level Path</h1>
      <div className="flex flex-col w-full gap-8 relative">
        {CHAPTERS.map(chapter => (
          <div key={chapter.id} className="flex flex-col gap-4">
            <h2 className="text-xl font-display text-ink bg-surface py-2 px-4 rounded-xl text-center shadow-sm border border-ink/20 sticky top-4 z-10">
              {chapter.name}
            </h2>
            <div className="flex flex-col items-center gap-8 py-4">
              {chapter.levels.map(levelId => {
                const levelIndex = flatLevels.indexOf(levelId);
                const previousLevelId = levelIndex > 0 ? flatLevels[levelIndex - 1] : null;
                const stars = getStars(levelId);
                const isUnlocked = levelIndex === 0 || (previousLevelId && getStars(previousLevelId) > 0);
                
                const inner = (
                  <>
                    <span className="font-display font-bold text-ink">{levelId.split('-l')[1]}</span>
                    {stars > 0 && (
                      <div className="absolute -bottom-2 flex gap-[2px]">
                        {Array.from({length: stars}).map((_, i) => (
                          <StarSvg key={i} className="text-gold w-3 h-3" />
                        ))}
                      </div>
                    )}
                  </>
                );

                return (
                  <motion.div key={levelId} whileTap={isUnlocked ? { scale: 0.9 } : undefined} transition={softBounce}>
                    {isUnlocked ? (
                      <Link 
                        href={`/level-path/${levelId}`} 
                        className="w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 relative bg-accent border-ink shadow-[0_4px_0_var(--ink)] cursor-pointer"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div 
                        aria-disabled="true"
                        className="w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 relative bg-surface border-ink/20 opacity-60 pointer-events-none"
                      >
                        {inner}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
