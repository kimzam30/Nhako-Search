'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import { CHAPTERS, LEVELS } from '@/lib/levels/data';
import { loadLevelProgress } from '@/lib/levels/progress';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { StarSvg, CloseSvg } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';

// A simple lock icon for closed nodes
const LockSvg = ({ className = '' }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="5" y="11" width="14" height="10" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0110 0v4"></path>
  </svg>
);

// Player marker (a small doodle bug or character)
const PlayerMarkerSvg = ({ className = '' }: { className?: string }) => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="6" />
    <path d="M12 2 L12 6 M12 18 L12 22 M2 12 L6 12 M18 12 L22 12" />
  </svg>
);

const CHAPTER_COLORS: Record<string, string> = {
  'garden': 'bg-[#7FCB9C]/20', // found color
  'rainy-day': 'bg-[#FFD166]/20', // gold
  'cozy-cottage': 'bg-[#FFC1D9]/20', // accent-soft
  'night-sky': 'bg-[#4A1942]/10', // ink
  'date-night': 'bg-[#FF6FA5]/20', // accent
};

export default function LevelPathPage() {
  const [progress, setProgress] = useState<any[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  
  useEffect(() => {
    loadLevelProgress().then(setProgress);
  }, []);

  const getStars = (levelId: string) => {
    const p = progress.find(p => p.level_id === levelId);
    return p ? p.stars : 0;
  };

  const flatLevels = CHAPTERS.flatMap(c => c.levels);
  
  // Find the highest unlocked level
  let highestUnlockedIndex = 0;
  for (let i = 0; i < flatLevels.length; i++) {
    if (i === 0) continue;
    if (getStars(flatLevels[i-1]) > 0) {
      highestUnlockedIndex = i;
    } else {
      break;
    }
  }

  // Winding offset pattern
  const offsets = [0, 30, 60, 40, -10, -50, -60, -30];

  return (
    <div className="flex flex-col items-center flex-1 w-full relative pb-32">
      {/* Background zones */}
      <div className="absolute inset-0 w-full h-full -z-10 flex flex-col">
        {CHAPTERS.map(chapter => {
          const colorKey = chapter.id.replace(/c\d+/, '').trim(); // if id is c1, c7, etc... wait, CHAPTER_COLORS uses names or old ids.
          // Let's map dynamically using chapter name
          const themeName = chapter.name.toLowerCase().replace(' ii', '').replace(' ', '-');
          return <div key={chapter.id} className={`flex-1 w-full ${CHAPTER_COLORS[themeName] || 'bg-background'}`} />
        })}
      </div>

      <div className="flex flex-col items-center w-full max-w-lg mx-auto p-4 pt-10">
        <h1 className="text-3xl font-display text-ink mb-10 bg-surface/80 px-6 py-2 rounded-2xl border-2 border-ink shadow-[4px_5px_0_0_var(--ink)] backdrop-blur-sm sticky top-4 z-20" style={{ borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px' }}>
          Level Path
        </h1>

        <div className="flex flex-col w-full relative items-center pb-20">
          
          {/* Path line background */}
          <div className="absolute top-0 bottom-0 w-2 bg-ink/10 rounded-full" />

          {CHAPTERS.map((chapter) => (
            <ChapterView 
              key={chapter.id}
              chapter={chapter}
              flatLevels={flatLevels}
              highestUnlockedIndex={highestUnlockedIndex}
              getStars={getStars}
              offsets={offsets}
              onSelectLevel={setSelectedLevel}
            />
          ))}
        </div>
      </div>


      {/* Level Info Bottom Sheet Modal */}
      <AnimatePresence>
        {selectedLevel && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-[60]"
              onClick={() => setSelectedLevel(null)}
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={softBounce}
              className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-surface border-t-2 border-l-2 border-r-2 border-ink rounded-tl-[32px] rounded-tr-[24px] p-6 z-[60] shadow-[0_-4px_20px_rgba(0,0,0,0.1)] pb-12"
            >
              <div className="w-12 h-1.5 bg-ink/20 rounded-full mx-auto mb-6" />
              <button 
                onClick={() => setSelectedLevel(null)}
                className="absolute top-6 right-6 text-ink/60 hover:text-ink"
              >
                <CloseSvg className="w-6 h-6" />
              </button>
              
              <h3 className="text-sm font-bold text-ink/60 uppercase tracking-widest mb-1">
                {CHAPTERS.find(c => c.levels.includes(selectedLevel))?.name}
              </h3>
              <h2 className="text-4xl font-display text-ink mb-6">Level {selectedLevel.split('-l')[1]}</h2>
              
              <div className="flex gap-2 mb-8">
                {Array.from({length: 3}).map((_, i) => (
                  <StarSvg key={i} className={`w-8 h-8 ${i < getStars(selectedLevel) ? 'text-gold drop-shadow-sm' : 'text-ink/10'}`} filled={i < getStars(selectedLevel)} />
                ))}
              </div>
              
              <div className="flex gap-4 items-center bg-background border-2 border-ink/10 p-4 rounded-xl mb-8">
                <span className="font-bold text-ink/70">Goal:</span>
                <span className="text-ink font-medium font-body text-lg">Find all words</span>
              </div>

              <Link href={`/level-path/${selectedLevel}`}>
                <Button variant="primary" fullWidth className="text-xl py-4">
                  Play Level
                </Button>
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChapterView({ chapter, flatLevels, highestUnlockedIndex, getStars, offsets, onSelectLevel }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, { rootMargin: '1000px 0px' });
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Approximate height: header (~90px) + levels * gap (112px) + padding
  const estimatedHeight = 90 + (chapter.levels.length * 112) + 60;

  return (
    <div ref={ref} className="flex flex-col w-full relative mb-12" style={{ minHeight: `${estimatedHeight}px` }}>
      {isVisible ? (
        <>
          <h2 className="text-2xl font-display text-ink bg-surface py-2 px-6 rounded-xl text-center shadow-[4px_5px_0_0_var(--ink)] border-2 border-ink self-center z-10 mb-8" style={{ borderRadius: '15px 225px 15px 255px/255px 15px 225px 15px', transform: 'rotate(-2deg)' }}>
            {chapter.name}
          </h2>
          
          <div className="flex flex-col items-center gap-12 py-4 relative">
            {chapter.levels.map((levelId: string) => {
              const levelIndex = flatLevels.indexOf(levelId);
              const stars = getStars(levelId);
              const isUnlocked = levelIndex <= highestUnlockedIndex;
              const isCurrent = levelIndex === highestUnlockedIndex;
              
              const offset = offsets[levelIndex % offsets.length];

              return (
                <div key={levelId} className="relative flex justify-center items-center w-full" style={{ left: `${offset}px` }}>
                  
                  {isCurrent && (
                    <>
                      <motion.div 
                        className="absolute w-20 h-20 bg-accent/30 rounded-full"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      />
                      <motion.div 
                        className="absolute -top-6 z-20 drop-shadow-md"
                        animate={{ y: [0, -6] }}
                        transition={{ 
                          duration: 0.5, 
                          repeat: Infinity, 
                          repeatType: "reverse",
                          ease: "easeInOut"
                        }}
                      >
                        <PlayerMarkerSvg />
                      </motion.div>
                    </>
                  )}

                  <motion.button 
                    whileTap={isUnlocked ? { scale: 0.9, y: 2, boxShadow: '0 0 0 0 var(--ink)' } : {}} 
                    transition={softBounce}
                    onClick={() => {
                      if (isUnlocked) onSelectLevel(levelId);
                    }}
                    aria-disabled={!isUnlocked}
                    className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 relative z-10 
                      ${isUnlocked ? 'bg-surface border-ink shadow-[4px_5px_0_0_var(--ink)] cursor-pointer hover:bg-white' 
                                   : 'bg-surface/50 border-ink/20 opacity-70 pointer-events-none'}`}
                    style={{ borderRadius: '45% 55% 40% 60% / 55% 45% 60% 40%' }}
                  >
                    {isUnlocked ? (
                      <>
                        <span className="font-display font-bold text-ink text-xl">{levelId.split('-l')[1]}</span>
                        {stars > 0 && (
                          <div className="absolute -bottom-3 flex gap-[2px] bg-surface rounded-full px-1 border border-ink/20">
                            {Array.from({length: 3}).map((_, i) => (
                              <StarSvg key={i} className={`w-3 h-3 ${i < stars ? 'text-gold' : 'text-ink/20'}`} filled={i < stars} />
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <LockSvg className="w-6 h-6 text-ink/30" />
                    )}
                  </motion.button>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
