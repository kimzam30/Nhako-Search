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
    <div className="flex flex-col items-center w-full max-w-lg mx-auto opacity-80 pointer-events-none grayscale-[0.2]">
      <div className="w-full flex flex-col items-center justify-center gap-4">
        <div className="w-full flex justify-center">
          {/* A read-only mirror of the partner's board: not a tab stop, and
              interaction handlers are no-ops. */}
          <GridBoard
            {...game}
            readOnly
            foundWords={foundWords}
            selectedCells={[]}
            onPointerDown={() => {}}
            onPointerEnter={() => {}}
            onPointerUp={() => {}}
          />
        </div>

        <div className="w-full">
          <WordList words={wordListProps} />
        </div>
      </div>
    </div>
  );
}
