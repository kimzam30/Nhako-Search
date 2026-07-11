'use client';

import { useGameLogic } from '@/lib/puzzle/useGameLogic';
import { LetterCell } from './LetterCell';

export function GridBoard({ grid, foundWords, selectedCells, onPointerDown, onPointerEnter, onPointerUp }: ReturnType<typeof useGameLogic>) {
  return (
    <div 
      className="bg-surface p-4 rounded-3xl shadow-sm border-2 border-ink inline-block touch-none"
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div 
        className="grid gap-1 sm:gap-2" 
        style={{ gridTemplateColumns: `repeat(${grid.width}, minmax(0, 1fr))` }}
      >
        {grid.cells.flat().map((cell, idx) => {
          const isSelected = selectedCells.some(c => c.x === cell.x && c.y === cell.y);
          const isFound = grid.placedWords.some(pw => {
             if (!foundWords.includes(pw.word)) return false;
             
             const minX = Math.min(pw.startX, pw.endX);
             const maxX = Math.max(pw.startX, pw.endX);
             const minY = Math.min(pw.startY, pw.endY);
             const maxY = Math.max(pw.startY, pw.endY);
             
             if (cell.x < minX || cell.x > maxX || cell.y < minY || cell.y > maxY) return false;
             
             const dx = pw.endX - pw.startX;
             const dy = pw.endY - pw.startY;
             
             if (dx === 0) return cell.x === pw.startX;
             if (dy === 0) return cell.y === pw.startY;
             return Math.abs(cell.x - pw.startX) === Math.abs(cell.y - pw.startY);
          });
          
          return (
            <LetterCell 
              key={idx}
              cell={cell}
              isSelected={isSelected}
              isFound={isFound}
              onPointerDown={onPointerDown}
              onPointerEnter={onPointerEnter}
            />
          );
        })}
      </div>
    </div>
  );
}
