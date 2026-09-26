'use client';

import { useGameLogic } from '@/lib/puzzle/useGameLogic';
import { GridBoard, wordColor } from '@/components/game/GridBoard';
import { WordList } from '@/components/game/WordList';
import { ButterflyGarland } from '@/components/game/ButterflyGarland';
import { WinCelebration } from '@/components/game/WinCelebration';
import { Difficulty } from '@/lib/puzzle/generator';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ClockSvg, WandSvg } from '@/components/ui/Icons';
import { DoodleButterfly } from '@/components/ui/Doodles';
import { useAmbientAudio } from '@/components/sound/AmbientAudioProvider';
import { useGameTitle } from '@/lib/nav/gameTitle';
import { haptic } from '@/lib/audio/sfx';

interface Props {
  words: string[];
  difficulty: Difficulty;
  seedStr?: string;
  onComplete?: (stars: number, timeSeconds: number) => void;
  /**
   * `total` is the number of words actually placed in the grid, which can be
   * lower than `words.length`. Callers must use it rather than counting the
   * requested list, or progress can never reach 100%.
   */
  onProgress?: (progress: number, foundWords: string[], total: number) => void;
  nextLevelHref?: string;
  onNext?: () => void;
  hideGarland?: boolean;
  /** Race mode renders its own result screen (and its own countdown intro). */
  hideWinOverlay?: boolean;
  /** Race mode shows its own countdown clock instead. */
  showTimer?: boolean;
  /** Hints are disabled in competitive play. */
  allowHints?: boolean;
  /**
   * Words your partner has already found on the same board (co-op mode).
   * They count toward completion and render as found, but are not yours.
   */
  partnerFoundWords?: string[];
  /** Words already found on this board, e.g. restored after a reload. */
  initialFoundWords?: string[];
  /** Backfill words for the generator (see generateGrid). */
  reserveWords?: string[];
  /** Where the completion sheet's primary action goes, when there is no next level. */
  doneHref?: string;
  doneLabel?: string;
}

/** Finds closer together than this chain into a combo. */
const COMBO_WINDOW_MS = 8000;
const COMBO_WORDS = ['Nice!', 'Great!', 'Amazing!', 'Brilliant!', 'Unstoppable!'];

interface Flight {
  id: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
}

/*
 * The game screen, laid out like a shipping word-search (docs/game-feel.md):
 *
 *   garland   progress as butterflies on a string (each find flies up to it)
 *   board     notebook paper, one coloured capsule per word
 *   tray      the word bank as chips
 *   boosters  timer pill + hint booster, pinned at the thumb
 *
 * In landscape (the `wide` variant) the tray and boosters move into a column
 * beside the board; portrait tablets stack like a phone.
 */
export function GameClient({
  words,
  difficulty,
  seedStr = 'daily-seed-123',
  onComplete,
  onProgress,
  nextLevelHref,
  onNext,
  hideGarland = false,
  hideWinOverlay = false,
  showTimer = true,
  allowHints = true,
  partnerFoundWords,
  initialFoundWords,
  reserveWords,
  doneHref,
  doneLabel,
}: Props) {
  const { playSfx } = useAmbientAudio();
  const title = useGameTitle();

  const [shake, setShake] = useState(false);
  const [combo, setCombo] = useState<{ id: number; text: string } | null>(null);
  const comboRef = useRef({ last: 0, level: -1 });

  // Sound and haptics on every resolved attempt; finds chain into combos.
  const handleResolve = useCallback(
    (matched: string | null) => {
      if (matched) {
        const now = Date.now();
        const c = comboRef.current;
        c.level = now - c.last < COMBO_WINDOW_MS ? c.level + 1 : 0;
        c.last = now;
        playSfx('found', c.level);
        haptic(25);
        if (c.level > 0) {
          playSfx('combo', c.level);
          setCombo({ id: now, text: COMBO_WORDS[Math.min(c.level - 1, COMBO_WORDS.length - 1)] });
        }
      } else {
        playSfx('miss');
        haptic([12, 40, 12]);
        setShake(true);
      }
    },
    [playSfx]
  );

  useEffect(() => {
    if (!shake) return;
    const t = window.setTimeout(() => setShake(false), 460);
    return () => window.clearTimeout(t);
  }, [shake]);

  useEffect(() => {
    if (!combo) return;
    const t = window.setTimeout(() => setCombo(null), 1000);
    return () => window.clearTimeout(t);
  }, [combo]);

  const game = useGameLogic(words, difficulty, seedStr, {
    onResolve: handleResolve,
    initialFound: initialFoundWords,
    reserve: reserveWords,
  });

  // A note per letter while tracing, climbing the scale as the word grows.
  const traced = game.selectedCells.length;
  const lastTraced = useRef(0);
  useEffect(() => {
    if (traced > lastTraced.current && traced > 0) playSfx('select', traced);
    lastTraced.current = traced;
  }, [traced, playSfx]);

  // ---------------------------------------------------------------- intro
  // A short title card as the board appears, like any level-based game. It
  // never blocks play: it fades after a beat or on the first touch of the
  // board. Race mode has its own synced countdown; a restored board skips it.
  const [intro, setIntro] = useState(() => !hideWinOverlay && !(initialFoundWords?.length));
  const [startTime] = useState(() => Date.now());
  useEffect(() => {
    if (!intro) return;
    playSfx('whoosh');
    const t = window.setTimeout(() => setIntro(false), 1200);
    return () => window.clearTimeout(t);
    // Only on mount: the intro plays once per board.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const endIntro = useCallback(() => setIntro(false), []);

  const [elapsed, setElapsed] = useState(0);
  const [win, setWin] = useState<{ stars: number; seconds: number } | null>(null);
  const isWon = win !== null;

  // One tick per second, and it stops as soon as the puzzle is won.
  useEffect(() => {
    if (isWon || !showTimer) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [isWon, showTimer, startTime]);

  const handleHint = () => {
    if (game.useHint()) playSfx('hint');
  };

  // In co-op the board is shared, so completion is the union of both players'
  // finds. In solo/race, partnerFoundWords is undefined and this is a no-op.
  const allFound = useMemo(
    () =>
      partnerFoundWords?.length
        ? Array.from(new Set([...game.foundWords, ...partnerFoundWords]))
        : game.foundWords,
    [game.foundWords, partnerFoundWords]
  );

  const colorOf = useMemo(() => {
    const m = new Map<string, string>();
    game.grid.placedWords.forEach((pw, i) => m.set(pw.word, wordColor(i)));
    return m;
  }, [game.grid.placedWords]);

  const wordListProps = game.grid.placedWords.map(pw => ({
    word: pw.word,
    found: allFound.includes(pw.word),
    color: colorOf.get(pw.word),
  }));

  const totalWords = game.grid.placedWords.length;

  // Report the real total once the grid exists, so a caller starting at 0/0
  // (race mode) knows how many words are actually findable.
  const reportedTotalRef = useRef(-1);
  useEffect(() => {
    if (reportedTotalRef.current !== totalWords) {
      reportedTotalRef.current = totalWords;
      onProgress?.(game.foundWords.length, game.foundWords, totalWords);
    }
  }, [totalWords, game.foundWords, onProgress]);

  const prevProgressRef = useRef(game.foundWords.length);
  useEffect(() => {
    if (game.foundWords.length !== prevProgressRef.current) {
      prevProgressRef.current = game.foundWords.length;
      onProgress?.(game.foundWords.length, game.foundWords, totalWords);
    }
  }, [game.foundWords.length, game.foundWords, totalWords, onProgress]);

  // ------------------------------------------------------ butterfly flight
  // Each word you find releases a butterfly that flies from its capsule to
  // its slot on the garland (design.md §5). The slot fills when it lands.
  const gridRef = useRef<HTMLDivElement>(null);
  const garlandRef = useRef<HTMLDivElement>(null);
  const [landed, setLanded] = useState(allFound.length);
  const [flights, setFlights] = useState<Flight[]>([]);
  const seenRef = useRef(allFound.length);

  useEffect(() => {
    const prev = seenRef.current;
    seenRef.current = allFound.length;
    if (allFound.length <= prev) return;
    const grid = gridRef.current;
    const garland = garlandRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!grid || !garland || hideGarland || reduce) {
      setLanded(allFound.length);
      return;
    }
    const rect = grid.getBoundingClientRect();
    const cw = rect.width / game.grid.width;
    const ch = rect.height / game.grid.height;
    const newFlights: Flight[] = [];
    for (let i = prev; i < allFound.length; i++) {
      const pw = game.grid.placedWords.find(p => p.word === allFound[i]);
      const slot = garland.querySelector<HTMLElement>(`[data-slot="${i}"]`);
      if (!pw || !slot) continue;
      const s = slot.getBoundingClientRect();
      newFlights.push({
        id: Date.now() + i,
        from: {
          x: rect.left + ((pw.startX + pw.endX) / 2 + 0.5) * cw,
          y: rect.top + ((pw.startY + pw.endY) / 2 + 0.5) * ch,
        },
        to: { x: s.left + s.width / 2, y: s.top + s.height / 2 },
        color: colorOf.get(pw.word) ?? 'var(--word-1)',
      });
    }
    setFlights(f => [...f, ...newFlights]);
  }, [allFound, game.grid, hideGarland, colorOf]);

  const land = (id: number) => {
    setFlights(f => f.filter(x => x.id !== id));
    setLanded(n => Math.min(n + 1, allFound.length));
    playSfx('pop');
  };

  const garlandColors = allFound.map(w => colorOf.get(w) ?? 'var(--word-1)');

  /*
   * Completion. The finish time comes from the clock at the moment the last
   * word lands — an external input — so it is captured in an effect, as one
   * state write; the sound, haptic and onComplete fire exactly once.
   */
  const complete = totalWords > 0 && allFound.length >= totalWords;
  useEffect(() => {
    if (!complete || win) return;
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    const earned = seconds < 60 ? 3 : seconds < 120 ? 2 : 1;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWin({ stars: earned, seconds });
    // Let the last butterfly land before the fanfare.
    const t = window.setTimeout(() => {
      playSfx('win');
      haptic([30, 60, 30, 60, 60]);
    }, 450);
    onComplete?.(earned, seconds);
    return () => window.clearTimeout(t);
  }, [complete, win, startTime, onComplete, playSfx]);

  // The celebration waits for the final flight, so the last find is seen.
  const [showWin, setShowWin] = useState(false);
  useEffect(() => {
    if (!isWon) return;
    const t = window.setTimeout(() => setShowWin(true), 700);
    return () => window.clearTimeout(t);
  }, [isWon]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const left = totalWords - allFound.length;
  const showBoosters = showTimer || allowHints;

  const boosters = showBoosters && (
    <div className="flex items-center justify-between gap-3 w-full">
      {showTimer ? (
        <span className="hud-pill text-lg" role="timer" aria-label={`Elapsed time ${mins} minutes ${secs} seconds`}>
          <ClockSvg className="w-5 h-5 text-accent-ink" />
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
      ) : (
        <span />
      )}
      <span className="font-display font-bold text-ink-2 tabular whitespace-nowrap text-sm sm:text-base">{left > 0 ? `${left} left` : 'All found!'}</span>
      {allowHints ? (
        <button
          type="button"
          onClick={handleHint}
          disabled={game.remainingCount === 0}
          aria-label={`Hint${game.hintsUsed > 0 ? ` (${game.hintsUsed})` : ''}`}
          data-sfx="none"
          className="press relative flex items-center gap-2 h-14 pl-3 pr-4 border-2 border-line bg-gold text-on-accent font-display font-bold text-lg shadow-[3px_4px_0_0_var(--line)] disabled:opacity-40"
          style={{ borderRadius: '18px 12px 16px 10px' }}
        >
          <WandSvg className="w-6 h-6" />
          Hint
          {game.hintsUsed > 0 && (
            <span className="absolute -top-2.5 -right-2.5 min-w-6 h-6 px-1 flex items-center justify-center rounded-full border-2 border-line bg-accent text-on-accent text-xs tabular">
              {game.hintsUsed}
            </span>
          )}
        </button>
      ) : (
        <span />
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col items-center w-full max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto relative gap-2 sm:gap-3">
      {!hideGarland && (
        <div className="flex-none w-full flex justify-center">
          <ButterflyGarland ref={garlandRef} count={landed} total={totalWords} colors={garlandColors} />
        </div>
      )}

      {/*
        Phones: board and tray are centred in the height left over (the auto
        top margin on the board and on the boosters split the spare space), and
        the boosters sit at the bottom by the thumb. The side column is
        `display: contents` there, so the boosters are rendered once and just
        placed differently. Landscape (`wide`): tray + boosters form a real
        column beside the board.
      */}
      <div className="w-full flex-1 flex flex-col wide:flex-row items-center wide:justify-center gap-3 wide:gap-6">
        <div className="relative w-full mt-auto wide:mt-0 wide:flex-1 wide:min-w-0 flex justify-center" onPointerDownCapture={intro ? endIntro : undefined}>
          {/* foundWords overrides the hook's own list so a partner's finds
              appear on this board too. */}
          <GridBoard {...game} foundWords={allFound} gridRef={gridRef} shake={shake} />

          {/* Combo callout over the board. */}
          <AnimatePresence>
            {combo && (
              <motion.div
                key={combo.id}
                initial={{ opacity: 0, scale: 0.4, y: 10, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, y: -10, rotate: -4 }}
                exit={{ opacity: 0, y: -40, transition: { duration: 0.25 } }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 z-30 px-5 py-2 border-2 border-line bg-accent text-on-accent font-display font-bold text-3xl shadow-[3px_4px_0_0_var(--line)] whitespace-nowrap"
                style={{ borderRadius: '18px 10px 20px 12px' }}
                role="status"
              >
                {combo.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Level intro card: decorative, never in the way of the first drag. */}
          <AnimatePresence>
            {intro && (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              >
                <motion.span
                  className="nera-open flex flex-col items-center gap-1 px-8 py-5 bg-surface border-2 border-line shadow-[4px_5px_0_0_var(--line)]"
                  style={{ borderRadius: '22px 14px 24px 12px' }}
                  exit={{ scale: 1.1, opacity: 0 }}
                >
                  <DoodleButterfly className="w-14 idle-float" />
                  <span className="font-display font-bold text-2xl text-ink">{title || 'Ready?'}</span>
                  <span className="font-body font-extrabold text-ink-2">Find {totalWords} words</span>
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="contents wide:flex wide:flex-col wide:gap-4 wide:w-60 lg:w-72 wide:flex-none">
          <div className="w-full">
            <WordList words={wordListProps} />
          </div>
          {boosters ? (
            <div className="w-full mt-auto wide:mt-0 sticky wide:static bottom-0 pt-1 wide:pt-0 pb-[max(0.25rem,var(--safe-bottom))] wide:pb-0">
              {boosters}
            </div>
          ) : (
            // Keeps the board + tray centred when there are no boosters (race).
            <div className="mt-auto wide:hidden" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* Butterflies in flight to the garland. */}
      {flights.map(f => (
        <motion.div
          key={f.id}
          className="fixed top-0 left-0 z-50 pointer-events-none w-9 -ml-[18px] -mt-[15px]"
          initial={{ x: f.from.x, y: f.from.y, scale: 0.3, rotate: 0 }}
          animate={{
            x: [f.from.x, (f.from.x + f.to.x) / 2 + 40, f.to.x],
            y: [f.from.y, Math.min(f.from.y, f.to.y) - 30, f.to.y],
            scale: [0.3, 1.5, 0.8],
            rotate: [0, -20, 8],
          }}
          transition={{ duration: 0.75, ease: [0.45, 0, 0.2, 1] }}
          onAnimationComplete={() => land(f.id)}
          aria-hidden="true"
        >
          <DoodleButterfly className="w-full" wing={f.color} />
        </motion.div>
      ))}

      {showWin && !hideWinOverlay && win && (
        <WinCelebration
          title={nextLevelHref ? 'Level complete!' : 'Puzzle complete!'}
          stars={win.stars}
          seconds={win.seconds}
          words={totalWords}
          hints={game.hintsUsed}
        >
          {nextLevelHref ? (
            <>
              <ButtonLink href={nextLevelHref} replace fullWidth className="text-xl min-h-[56px]">
                Next level
              </ButtonLink>
              <ButtonLink href="/level-path" replace variant="secondary" fullWidth>
                Back to map
              </ButtonLink>
            </>
          ) : onNext ? (
            <>
              <Button fullWidth onClick={onNext} className="text-xl min-h-[56px]">
                New puzzle
              </Button>
              <ButtonLink href="/play/standard" replace variant="secondary" fullWidth>
                Change theme
              </ButtonLink>
            </>
          ) : (
            <ButtonLink href={doneHref ?? '/'} replace fullWidth className="text-xl min-h-[56px]">
              {doneLabel ?? 'Back to home'}
            </ButtonLink>
          )}
        </WinCelebration>
      )}
    </div>
  );
}
