'use client';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CHAPTERS, ALL_LEVEL_IDS, getLevelMeta } from '@/lib/levels/data';
import { loadLevelProgress } from '@/lib/levels/progress';
import type { LevelProgressRow } from '@/lib/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StarSvg, LockSvg } from '@/components/ui/Icons';
import { ButtonLink } from '@/components/ui/Button';
import { Sheet, afterSheetClosed } from '@/components/ui/Sheet';

const CHAPTER_COLORS: Record<string, string> = {
  'garden': 'bg-[#7FCB9C]/20',
  'rainy-day': 'bg-[#FFD166]/20',
  'cozy-cottage': 'bg-[#FFC1D9]/20',
  'night-sky': 'bg-[#4A1942]/10',
  'date-night': 'bg-[#FF6FA5]/20',
};

// Winding offset pattern, scaled per breakpoint by --level-wind.
const OFFSETS = [0, 30, 60, 40, -10, -50, -60, -30];

export default function LevelPathPage() {
  const [progress, setProgress] = useState<LevelProgressRow[] | null>(null);
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLevelProgress().then(rows => {
      if (!cancelled) setProgress(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const starsById = useMemo(
    () => new Map((progress ?? []).map(p => [p.level_id, p.stars ?? 0])),
    [progress]
  );
  const getStars = (id: string) => starsById.get(id) ?? 0;

  // A level unlocks once the one before it has stars.
  const highestUnlockedIndex = useMemo(() => {
    let i = 0;
    while (i + 1 < ALL_LEVEL_IDS.length && (starsById.get(ALL_LEVEL_IDS[i]) ?? 0) > 0) i++;
    return i;
  }, [starsById]);

  const currentId = ALL_LEVEL_IDS[highestUnlockedIndex];
  const selectedMeta = selectedLevel ? getLevelMeta(selectedLevel) : undefined;

  return (
    // overflow-x-clip: each level row is shifted sideways by its winding offset,
    // which widened the page on phones and pushed the fixed tab bar's labels
    // below the screen. `clip` (not `hidden`) keeps the sticky header working.
    <div className="flex flex-col items-center flex-1 w-full relative overflow-x-clip">
      {/* Background zones */}
      <div className="absolute inset-0 w-full h-full -z-10 flex flex-col" aria-hidden="true">
        {CHAPTERS.map(chapter => {
          const themeName = chapter.name.toLowerCase().replace(' ii', '').replace(' ', '-');
          return <div key={chapter.id} className={`flex-1 w-full ${CHAPTER_COLORS[themeName] || 'bg-background'}`} />;
        })}
      </div>

      <div className="flex flex-col items-center w-full max-w-lg mx-auto px-4" style={{ paddingTop: 'max(1rem, var(--safe-top))' }}>
        <h1
          className="text-3xl font-display text-ink mb-8 bg-surface/90 px-6 py-2 rounded-2xl border-2 border-ink shadow-[4px_5px_0_0_var(--ink)] backdrop-blur-sm sticky z-20"
          style={{ top: 'max(0.75rem, var(--safe-top))', borderRadius: '22px 9px 26px 13px' }}
        >
          Level Path
        </h1>

        <div className="flex flex-col w-full relative items-center pb-10">
          <div className="absolute top-0 bottom-0 w-2 bg-ink/10 rounded-full" aria-hidden="true" />
          {CHAPTERS.map(chapter => (
            <ChapterView
              key={chapter.id}
              chapter={chapter}
              highestUnlockedIndex={highestUnlockedIndex}
              currentId={progress ? currentId : null}
              getStars={getStars}
              onSelectLevel={setSelectedLevel}
            />
          ))}
        </div>
      </div>

      <Sheet open={!!selectedLevel} onClose={() => setSelectedLevel(null)} title={selectedMeta ? `Level ${selectedMeta.numberInChapter}` : undefined}>
        {selectedLevel && selectedMeta && (
          <div className="flex flex-col gap-5">
            <p className="text-sm font-extrabold text-ink-2 uppercase tracking-widest -mt-1">
              {selectedMeta.chapter} · {selectedMeta.difficulty}
            </p>
            <div className="flex gap-2" role="img" aria-label={`${getStars(selectedLevel)} of 3 stars`}>
              {Array.from({ length: 3 }).map((_, i) => (
                <StarSvg
                  key={i}
                  className={`w-9 h-9 ${i < getStars(selectedLevel) ? 'text-gold' : 'text-ink/15'}`}
                  filled={i < getStars(selectedLevel)}
                />
              ))}
            </div>
            <p className="font-body font-bold text-ink-2">Find every word. Under a minute earns three stars.</p>
            <ButtonLink
              href={`/level-path/${selectedLevel}`}
              fullWidth
              className="text-xl py-4"
              onClick={e => {
                // Close the sheet (popping its Back entry) before pushing the
                // level, so Back from the level lands on the map in one step.
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                const href = `/level-path/${selectedLevel}`;
                setSelectedLevel(null);
                afterSheetClosed(() => router.push(href));
              }}
            >
              {getStars(selectedLevel) > 0 ? 'Play again' : 'Play level'}
            </ButtonLink>
          </div>
        )}
      </Sheet>
    </div>
  );
}

interface ChapterViewProps {
  chapter: { id: string; name: string; levels: string[] };
  highestUnlockedIndex: number;
  currentId: string | null;
  getStars: (levelId: string) => number;
  onSelectLevel: (levelId: string) => void;
}

function ChapterView({ chapter, highestUnlockedIndex, currentId, getStars, onSelectLevel }: ChapterViewProps) {
  const ref = useRef<HTMLElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);
  const containsCurrent = currentId ? chapter.levels.includes(currentId) : false;
  const [isVisible, setIsVisible] = useState(false);
  const visible = isVisible || containsCurrent;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      rootMargin: '1000px 0px',
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Open the map where the player left off, like a native game's world map,
  // instead of at Garden level 1 every time.
  useEffect(() => {
    if (containsCurrent && currentRef.current) {
      currentRef.current.scrollIntoView({ block: 'center' });
    }
  }, [containsCurrent]);

  // Approximate height: header (~90px) + levels * gap (112px) + padding
  const estimatedHeight = 90 + chapter.levels.length * 112 + 60;

  return (
    <section ref={ref} aria-label={chapter.name} className="flex flex-col w-full relative mb-12" style={{ minHeight: `${estimatedHeight}px` }}>
      {visible ? (
        <>
          <h2
            className="text-2xl font-display text-ink bg-surface py-2 px-6 rounded-xl text-center shadow-[4px_5px_0_0_var(--ink)] border-2 border-ink self-center z-10 mb-8"
            style={{ borderRadius: '15px 225px 15px 255px/255px 15px 225px 15px' }}
          >
            {chapter.name}
          </h2>

          <ol className="flex flex-col items-center gap-12 py-4 relative">
            {chapter.levels.map(levelId => {
              const levelIndex = ALL_LEVEL_IDS.indexOf(levelId);
              const number = (getLevelMeta(levelId)?.numberInChapter ?? 0).toString();
              const stars = getStars(levelId);
              const isUnlocked = levelIndex <= highestUnlockedIndex;
              const isCurrent = levelId === currentId;
              const offset = OFFSETS[levelIndex % OFFSETS.length];

              return (
                <li
                  key={levelId}
                  className="relative flex justify-center items-center w-full"
                  style={{ left: `calc(${offset}px * var(--level-wind, 1))` }}
                >
                  {isCurrent && (
                    <motion.span
                      className="absolute w-20 h-20 bg-accent/30 rounded-full"
                      animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2.4 }}
                      aria-hidden="true"
                    />
                  )}
                  <button
                    ref={isCurrent ? currentRef : undefined}
                    type="button"
                    onClick={() => isUnlocked && onSelectLevel(levelId)}
                    aria-disabled={!isUnlocked}
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-label={
                      isUnlocked
                        ? `Level ${number}${stars ? `, ${stars} star${stars > 1 ? 's' : ''}` : isCurrent ? ', next' : ''}`
                        : `Level ${number}, locked`
                    }
                    className={`press w-16 h-16 flex flex-col items-center justify-center border-4 relative z-10 ${
                      isUnlocked
                        ? 'bg-surface border-ink shadow-[4px_5px_0_0_var(--ink)] cursor-pointer'
                        : 'bg-surface/60 border-ink/25 cursor-not-allowed'
                    }`}
                    style={{ borderRadius: '45% 55% 40% 60% / 55% 45% 60% 40%' }}
                  >
                    {isUnlocked ? (
                      <>
                        <span className="font-display font-bold text-ink text-xl tabular">{number}</span>
                        {stars > 0 && (
                          <span className="absolute -bottom-3 flex gap-[2px] bg-surface rounded-full px-1 border border-ink/20" aria-hidden="true">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <StarSvg key={i} className={`w-3 h-3 ${i < stars ? 'text-gold' : 'text-ink/20'}`} filled={i < stars} />
                            ))}
                          </span>
                        )}
                      </>
                    ) : (
                      <LockSvg className="w-6 h-6 text-ink-2" />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      ) : null}
    </section>
  );
}
