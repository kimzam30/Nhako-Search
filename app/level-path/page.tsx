'use client';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CHAPTERS, ALL_LEVEL_IDS, getLevelMeta } from '@/lib/levels/data';
import { usePlayer } from '@/lib/data/player';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StarSvg, LockSvg } from '@/components/ui/Icons';
import { ButtonLink } from '@/components/ui/Button';
import { Sheet, afterSheetClosed } from '@/components/ui/Sheet';
import { DoodleButterfly, ChapterArt } from '@/components/ui/Doodles';

/*
 * Chapter colour, from the capsule palette so it works in both themes. The
 * old fixed hexes at 10-20% alpha turned a muddy grey on the dark page.
 */
function chapterHue(name: string): string {
  const c = name.toLowerCase();
  if (c.startsWith('garden')) return 'var(--word-3)';
  if (c.startsWith('rainy')) return 'var(--word-5)';
  if (c.startsWith('cozy')) return 'var(--word-6)';
  if (c.startsWith('night')) return 'var(--word-2)';
  if (c.startsWith('date')) return 'var(--word-1)';
  return 'var(--word-4)';
}

// Winding offset pattern, scaled per breakpoint by --level-wind.
const OFFSETS = [0, 30, 60, 40, -10, -50, -60, -30];

export default function LevelPathPage() {
  // Shared, cached progress: the map opens with its stars already drawn.
  const { summary } = usePlayer();
  const progress = summary?.levels ?? null;
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

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
  const totalStars = useMemo(() => (progress ?? []).reduce((n, p) => n + (p.stars ?? 0), 0), [progress]);
  const selectedMeta = selectedLevel ? getLevelMeta(selectedLevel) : undefined;

  return (
    // overflow-x-clip: each level row is shifted sideways by its winding offset,
    // which widened the page on phones and pushed the fixed tab bar's labels
    // below the screen. `clip` (not `hidden`) keeps the sticky header working.
    <div className="flex flex-col items-center flex-1 w-full relative overflow-x-clip">
      {/* Background zones */}
      <div className="absolute inset-0 w-full h-full -z-10 flex flex-col" aria-hidden="true">
        {CHAPTERS.map(chapter => (
          <div
            key={chapter.id}
            className="flex-1 w-full"
            style={{ background: `color-mix(in srgb, ${chapterHue(chapter.name)} calc(14% * var(--tint-boost)), var(--bg))` }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center w-full max-w-lg mx-auto px-4" style={{ paddingTop: 'max(1rem, var(--safe-top))' }}>
        {/* HUD: title + total stars, pinned while the map scrolls. */}
        <div
          className="sticky z-20 mb-8 flex items-center gap-3 bg-surface/95 pl-5 pr-2 py-1.5 border-2 border-line shadow-[4px_5px_0_0_var(--line)] backdrop-blur-sm"
          style={{ top: 'max(0.75rem, var(--safe-top))', borderRadius: '22px 9px 26px 13px' }}
        >
          <h1 className="text-2xl font-display text-ink">Level map</h1>
          <span className="hud-pill text-sm !shadow-none" aria-label={`${totalStars} stars earned`}>
            <StarSvg className="w-4 h-4 text-gold" filled />
            {totalStars}
          </span>
        </div>

        <div className="flex flex-col w-full relative items-center pb-10">
          {/* The trail: a dotted pencil line down the middle. */}
          <div className="absolute top-0 bottom-0 w-0 border-l-[5px] border-dotted border-ink/20" aria-hidden="true" />
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

  const hue = chapterHue(chapter.name);

  // Approximate height: header (~90px) + levels * gap (112px) + padding
  const estimatedHeight = 90 + chapter.levels.length * 112 + 60;

  return (
    <section ref={ref} aria-label={chapter.name} className="flex flex-col w-full relative mb-12" style={{ minHeight: `${estimatedHeight}px` }}>
      {visible ? (
        <>
          <div
            className="self-center z-10 mb-8 flex items-center gap-3 bg-surface py-2 pl-2 pr-5 border-2 border-line shadow-[4px_5px_0_0_var(--line)] -rotate-1"
            style={{ borderRadius: '20px 12px 22px 14px' }}
          >
            <span
              className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-line"
              style={{ background: `color-mix(in srgb, ${hue} calc(45% * var(--tint-boost)), var(--surface))` }}
            >
              <ChapterArt chapter={chapter.name} className="w-9 h-9" />
            </span>
            <span className="flex flex-col">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-ink-2">
                Chapter {CHAPTERS.indexOf(chapter) + 1}
              </span>
              <h2 className="text-xl font-display font-bold text-ink leading-tight">{chapter.name}</h2>
            </span>
            <span className="ml-2 text-xs font-extrabold text-ink-2 tabular">
              {chapter.levels.filter(id => getStars(id) > 0).length}/{chapter.levels.length}
            </span>
          </div>

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
                    <>
                      <motion.span
                        className="absolute w-20 h-20 bg-accent/30 rounded-full"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ repeat: Infinity, duration: 2.4 }}
                        aria-hidden="true"
                      />
                      {/* The player marker: your butterfly, perched on the next level. */}
                      <span className="absolute -top-11 z-20 idle-float pointer-events-none" aria-hidden="true">
                        <DoodleButterfly className="w-11" />
                      </span>
                    </>
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
                    className={`press flex flex-col items-center justify-center relative z-10 ${
                      isCurrent ? 'w-[76px] h-[76px] border-4' : 'w-16 h-16 border-[3px]'
                    } ${
                      isUnlocked
                        ? 'border-line shadow-[4px_5px_0_0_var(--line)] cursor-pointer'
                        : 'bg-surface/60 border-ink/25 cursor-not-allowed'
                    }`}
                    style={{
                      borderRadius: '45% 55% 40% 60% / 55% 45% 60% 40%',
                      background: isCurrent
                        ? 'var(--accent)'
                        : stars > 0
                          ? `color-mix(in srgb, ${hue} calc(70% * var(--tint-boost)), var(--surface))`
                          : isUnlocked
                            ? 'var(--surface)'
                            : undefined,
                    }}
                  >
                    {isUnlocked ? (
                      <>
                        <span
                          className={`font-display font-bold tabular ${isCurrent ? 'text-2xl text-on-accent' : stars > 0 ? 'text-xl text-on-accent' : 'text-xl text-ink'}`}
                        >
                          {number}
                        </span>
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
