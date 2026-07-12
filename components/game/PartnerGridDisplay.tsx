'use client';

import { useGameLogic } from '@/lib/puzzle/useGameLogic';
import { GridBoard } from '@/components/game/GridBoard';
import { WordList } from '@/components/game/WordList';
import { Difficulty } from '@/lib/puzzle/generator';

interface Props {
  words: string[];
  difficulty: Difficulty;
  seedStr: string;
  foundWords: string[];
}

export function PartnerGridDisplay({ words, difficulty, seedStr, foundWords }: Props) {
  // We use useGameLogic to deterministically reconstruct their grid
  const game = useGameLogic(words, difficulty, seedStr);

  const wordListProps = game.grid.placedWords.map(pw => ({
    word: pw.word,
    found: foundWords.includes(pw.word)
  }));

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto h-full min-h-0 opacity-80 pointer-events-none grayscale-[0.2]">
      <div className="flex-1 w-full min-h-0 flex flex-col md:flex-row items-center justify-center gap-6 relative">
        <div className="flex-1 w-full max-w-[400px] h-full flex flex-col items-center justify-center relative">
          <GridBoard 
            grid={game.grid}
            foundWords={foundWords}
            selectedCells={[]}
            onPointerDown={() => {}}
            onPointerEnter={() => {}}
            onPointerUp={() => {}}
          />
        </div>
        
        <div className="flex-none md:flex-1 md:h-full md:overflow-y-auto pt-2 pb-4">
          <WordList words={wordListProps} />
        </div>
      </div>
    </div>
  );
}
