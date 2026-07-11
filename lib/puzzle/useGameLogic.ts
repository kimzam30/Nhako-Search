import { useState, useCallback } from 'react';
import { Grid, generateGrid, Difficulty, GridCell } from './generator';

export function useGameLogic(words: string[], difficulty: Difficulty, seedStr: string) {
  const [grid] = useState<Grid>(() => generateGrid(words, difficulty, seedStr));
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [startCell, setStartCell] = useState<GridCell | null>(null);
  const [currentCell, setCurrentCell] = useState<GridCell | null>(null);
  
  const getSelectedCells = useCallback(() => {
    if (!startCell || !currentCell) return [];
    
    const dx = currentCell.x - startCell.x;
    const dy = currentCell.y - startCell.y;
    
    if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return [];
    
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    const stepX = dx === 0 ? 0 : dx / steps;
    const stepY = dy === 0 ? 0 : dy / steps;
    
    const cells: GridCell[] = [];
    for (let i = 0; i <= steps; i++) {
      const cx = startCell.x + stepX * i;
      const cy = startCell.y + stepY * i;
      cells.push(grid.cells[cy][cx]);
    }
    return cells;
  }, [startCell, currentCell, grid]);

  const onPointerDown = (cell: GridCell) => {
    setStartCell(cell);
    setCurrentCell(cell);
  };
  
  const onPointerEnter = (cell: GridCell) => {
    if (startCell) {
      setCurrentCell(cell);
    }
  };
  
  const onPointerUp = () => {
    const selected = getSelectedCells();
    if (selected.length > 0) {
      const word = selected.map(c => c.letter).join('');
      const wordReversed = selected.map(c => c.letter).reverse().join('');
      
      const found = grid.placedWords.find(
        pw => (pw.word === word || pw.word === wordReversed) && !foundWords.includes(pw.word)
      );
      
      if (found) {
        setFoundWords(prev => [...prev, found.word]);
      }
    }
    setStartCell(null);
    setCurrentCell(null);
  };
  
  return {
    grid,
    foundWords,
    selectedCells: getSelectedCells(),
    onPointerDown,
    onPointerEnter,
    onPointerUp
  };
}
