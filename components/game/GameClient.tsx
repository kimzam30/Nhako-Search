'use client';

import { useGameLogic } from '@/lib/puzzle/useGameLogic';
import { GridBoard } from '@/components/game/GridBoard';
import { WordList } from '@/components/game/WordList';
import { ButterflyGarland } from '@/components/game/ButterflyGarland';
import { Difficulty } from '@/lib/puzzle/generator';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button, ButtonLink } from '@/components/ui/Button';
import { StarSvg } from '@/components/ui/Icons';
import { useAmbientAudio } from '@/components/sound/AmbientAudioProvider';
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
  /** Race mode renders its own result screen. */
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

  // Sound and haptics on every resolved attempt. Finding a word used to be
  // completely silent, which made the game feel unresponsive.
  const handleResolve = useCallback(
    (matched: string | null) => {
      if (matched) {
        playSfx('found');
        haptic(25);
      } else {
        playSfx('miss');
        haptic([12, 40, 12]);
      }
    },
    [playSfx]
  );

  const game = useGameLogic(words, difficulty, seedStr, {
    onResolve: handleResolve,
    initialFound: initialFoundWords,
    reserve: reserveWords,
  });
  // Lazy initialiser: Date.now() as a bare argument re-runs on every render.
  const [startTime] = useState(() => Date.now());

  const [elapsed, setElapsed] = useState(0);
  const [win, setWin] = useState<{ stars: number; seconds: number } | null>(null);
  const isWon = win !== null;
  const stars = win?.stars ?? 0;
  const finishSeconds = win?.seconds ?? 0;

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

  const wordListProps = game.grid.placedWords.map(pw => ({
    word: pw.word,
    found: allFound.includes(pw.word)
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
    playSfx('win');
    haptic([30, 60, 30, 60, 60]);
    onComplete?.(earned, seconds);
  }, [complete, win, startTime, onComplete, playSfx]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="flex flex-col items-center w-full max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto relative">
      {!hideGarland && (
        <div className="flex-none w-full mb-1 flex justify-center">
          <ButterflyGarland count={allFound.length} total={game.grid.placedWords.length} />
        </div>
      )}

      {/* Stars are awarded on time, so the clock has to be visible. */}
      {(showTimer || allowHints) && (
        <div className="flex items-center justify-between w-full mb-2 px-1 gap-3">
          {showTimer ? (
            <div
              className="font-display font-bold text-ink text-lg tabular-nums"
              role="timer"
              aria-label={`Elapsed time ${mins} minutes ${secs} seconds`}
            >
              {mins}:{secs.toString().padStart(2, '0')}
            </div>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-3">
            <span className="font-body font-bold text-sm text-ink-2 tabular">
              {game.grid.placedWords.length - allFound.length} left
            </span>
            {allowHints && (
              <button
                onClick={handleHint}
                disabled={game.remainingCount === 0}
                className="px-3 py-2 min-h-[44px] rounded-xl border-2 border-ink bg-gold font-body font-bold text-sm text-on-accent shadow-[2px_3px_0_0_var(--ink)] active:translate-y-[2px] active:shadow-none disabled:opacity-40"
              >
                Hint{game.hintsUsed > 0 ? ` (${game.hintsUsed})` : ''}
              </button>
            )}
          </div>
        </div>
      )}

      {/*
        The board sizes itself from width (see .grid-board in globals.css).
        Do NOT reintroduce `h-full` + `aspect-square` on a wrapper here — that
        derives width from leftover flex height and collapses the board.
      */}
      <div className="w-full flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
        <div className="w-full md:flex-1 md:min-w-0 flex justify-center">
          {/* foundWords overrides the hook's own list so a partner's finds
              appear on this board too. */}
          <GridBoard {...game} foundWords={allFound} />
        </div>
        {/* Desktop gets a genuine second column: the board caps at 450px, so the
            extra width goes to the word list instead of stretching the grid. */}
        <div className="w-full md:w-48 lg:w-64 md:flex-none">
          <WordList words={wordListProps} />
        </div>
      </div>

      {isWon && !hideWinOverlay && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="presentation">
          <motion.div
            className="absolute inset-0 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="win-title"
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', duration: 0.45, bounce: 0.15 }}
            className="relative bg-surface w-full sm:max-w-sm border-2 border-ink rounded-t-[28px] sm:rounded-[28px] p-7 flex flex-col items-center gap-4 text-center shadow-[4px_5px_0_0_var(--ink)]"
            style={{ paddingBottom: 'max(1.75rem, calc(var(--safe-bottom) + 1.25rem))' }}
          >
            <h2 id="win-title" className="text-3xl font-display text-ink">
              {nextLevelHref ? 'Level complete!' : 'Puzzle complete!'}
            </h2>
            <div className="flex gap-2" role="img" aria-label={`${stars} of 3 stars`}>
              {Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.12, type: 'spring', duration: 0.4, bounce: 0.3 }}
                  className={i < stars ? 'text-gold' : 'text-ink/20'}
                >
                  <StarSvg className="w-11 h-11" filled={i < stars} />
                </motion.div>
              ))}
            </div>
            <p className="font-body font-bold text-ink-2 tabular">
              {Math.floor(finishSeconds / 60)}:{(finishSeconds % 60).toString().padStart(2, '0')}
            </p>

            <div className="flex flex-col gap-3 w-full mt-2">
              {nextLevelHref ? (
                <>
                  <ButtonLink href={nextLevelHref} replace fullWidth>
                    Next level
                  </ButtonLink>
                  <ButtonLink href="/level-path" replace variant="secondary" fullWidth>
                    Back to map
                  </ButtonLink>
                </>
              ) : onNext ? (
                <>
                  <Button fullWidth onClick={onNext}>
                    New puzzle
                  </Button>
                  <ButtonLink href="/play/standard" replace variant="secondary" fullWidth>
                    Change theme
                  </ButtonLink>
                </>
              ) : (
                <ButtonLink href={doneHref ?? '/'} replace fullWidth>
                  {doneLabel ?? 'Back to home'}
                </ButtonLink>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
