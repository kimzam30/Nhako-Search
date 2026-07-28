'use client';

import { useGameLogic } from '@/lib/puzzle/useGameLogic';
import { GridBoard } from '@/components/game/GridBoard';
import { WordList } from '@/components/game/WordList';
import { ButterflyGarland } from '@/components/game/ButterflyGarland';
import { Difficulty } from '@/lib/puzzle/generator';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import Link from 'next/link';
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

  const game = useGameLogic(words, difficulty, seedStr, { onResolve: handleResolve });
  const [startTime] = useState(Date.now());
  const [isWon, setIsWon] = useState(false);
  const [stars, setStars] = useState(0);
  const [elapsed, setElapsed] = useState(0);

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

  useEffect(() => {
    if (!isWon && allFound.length === game.grid.placedWords.length && game.grid.placedWords.length > 0) {
      setIsWon(true);
      const timeSeconds = Math.floor((Date.now() - startTime) / 1000);
      let calculatedStars = 1;
      if (timeSeconds < 60) calculatedStars = 3;
      else if (timeSeconds < 120) calculatedStars = 2;
      
      setStars(calculatedStars);
      playSfx('win');
      haptic([30, 60, 30, 60, 60]);
      onComplete?.(calculatedStars, timeSeconds);
    }
  }, [allFound.length, isWon, game.grid.placedWords.length, startTime, onComplete, playSfx]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="flex flex-col items-center w-full max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto relative">
      {!hideGarland && (
        <div className="flex-none w-full mb-4">
          <ButterflyGarland count={allFound.length} total={game.grid.placedWords.length} />
        </div>
      )}

      {/* Stars are awarded on time, so the clock has to be visible. */}
      {(showTimer || allowHints) && (
        <div className="flex items-center justify-between w-full mb-3 px-1 gap-3">
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
            <span className="font-body font-bold text-sm text-ink/60">
              {game.grid.placedWords.length - allFound.length} left
            </span>
            {allowHints && (
              <button
                onClick={handleHint}
                disabled={game.remainingCount === 0}
                className="px-3 py-2 min-h-[44px] rounded-xl border-2 border-ink bg-gold font-body font-bold text-sm text-ink shadow-[2px_3px_0_0_var(--ink)] active:translate-y-[2px] active:shadow-none disabled:opacity-40"
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
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={softBounce}
            className="bg-surface p-8 rounded-3xl border-4 border-ink shadow-sm flex flex-col items-center max-w-sm w-full gap-4 text-center"
          >
            <h2 className="text-4xl font-display text-ink">Level Complete!</h2>
            <div className="flex gap-2 text-4xl my-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.2 + 0.3, ...softBounce }}
                  className={i < stars ? 'text-gold drop-shadow-sm' : 'text-ink/20'}
                >
                  <StarSvg className="w-10 h-10" filled={i < stars} />
                </motion.div>
              ))}
            </div>
            
            <div className="flex flex-col gap-2 w-full mt-4">
              {nextLevelHref && (
                <Link href={nextLevelHref} className="w-full bg-accent text-ink font-body font-bold py-3 px-4 rounded-xl border-2 border-ink shadow-[0_4px_0_var(--ink)] active:translate-y-1 active:shadow-none min-h-[44px]">
                  Next Level
                </Link>
              )}
              {onNext && (
                <button onClick={onNext} className="w-full bg-accent text-ink font-body font-bold py-3 px-4 rounded-xl border-2 border-ink shadow-[0_4px_0_var(--ink)] active:translate-y-1 active:shadow-none min-h-[44px]">
                  New Puzzle
                </button>
              )}
              <Link href={nextLevelHref ? "/level-path" : "/"} className="w-full bg-surface text-ink font-body font-bold py-3 px-4 rounded-xl border-2 border-ink min-h-[44px]">
                {nextLevelHref ? "Back to Map" : "Back to Home"}
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
