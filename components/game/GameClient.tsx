'use client';

import { useGameLogic } from '@/lib/puzzle/useGameLogic';
import { GridBoard } from '@/components/game/GridBoard';
import { WordList } from '@/components/game/WordList';
import { ButterflyGarland } from '@/components/game/ButterflyGarland';
import { Difficulty } from '@/lib/puzzle/generator';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import Link from 'next/link';
import { StarSvg } from '@/components/ui/Icons';

interface Props {
  words: string[];
  difficulty: Difficulty;
  seedStr?: string;
  onComplete?: (stars: number, timeSeconds: number) => void;
  onProgress?: (progress: number) => void;
  nextLevelHref?: string;
  onNext?: () => void;
  hideGarland?: boolean;
}

export function GameClient({ words, difficulty, seedStr = 'daily-seed-123', onComplete, onProgress, nextLevelHref, onNext, hideGarland = false }: Props) {
  const game = useGameLogic(words, difficulty, seedStr);
  const [startTime] = useState(Date.now());
  const [isWon, setIsWon] = useState(false);
  const [stars, setStars] = useState(0);

  const wordListProps = game.grid.placedWords.map(pw => ({
    word: pw.word,
    found: game.foundWords.includes(pw.word)
  }));

  const prevProgressRef = useRef(game.foundWords.length);
  useEffect(() => {
    if (game.foundWords.length !== prevProgressRef.current) {
      prevProgressRef.current = game.foundWords.length;
      onProgress?.(game.foundWords.length);
    }
  }, [game.foundWords.length, onProgress]);

  useEffect(() => {
    if (!isWon && game.foundWords.length === game.grid.placedWords.length && game.grid.placedWords.length > 0) {
      setIsWon(true);
      const timeSeconds = Math.floor((Date.now() - startTime) / 1000);
      let calculatedStars = 1;
      if (timeSeconds < 60) calculatedStars = 3;
      else if (timeSeconds < 120) calculatedStars = 2;
      
      setStars(calculatedStars);
      onComplete?.(calculatedStars, timeSeconds);
    }
  }, [game.foundWords.length, isWon, game.grid.placedWords.length, startTime, onComplete]);
  
  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto pb-10 relative">
      {!hideGarland && <ButterflyGarland count={game.foundWords.length} total={game.grid.placedWords.length} />}
      <WordList words={wordListProps} />
      <GridBoard {...game} />

      {isWon && (
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
