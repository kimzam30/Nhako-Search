import { useState, useCallback, useRef } from 'react';
import { Grid, generateGrid, Difficulty, GridCell } from './generator';

export interface FocusPosition {
  x: number;
  y: number;
}

export interface GameLogicOptions {
  /** Fired when a selection resolves, so callers can add sound/haptics. */
  onResolve?: (matched: string | null) => void;
}

export function useGameLogic(
  words: string[],
  difficulty: Difficulty,
  seedStr: string,
  options: GameLogicOptions = {}
) {
  const [grid] = useState<Grid>(() => generateGrid(words, difficulty, seedStr));
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [startCell, setStartCell] = useState<GridCell | null>(null);
  const [currentCell, setCurrentCell] = useState<GridCell | null>(null);
  /** Letters revealed by hints, keyed "x,y". */
  const [hintedCells, setHintedCells] = useState<Set<string>>(() => new Set());
  const [hintsUsed, setHintsUsed] = useState(0);

  // Held in a ref so changing the callback never invalidates the commit path.
  const onResolveRef = useRef(options.onResolve);
  onResolveRef.current = options.onResolve;
  // Keyboard cursor. Separate from the selection anchor so players can look
  // around the grid without committing to a word.
  const [focus, setFocus] = useState<FocusPosition>({ x: 0, y: 0 });

  const getSelectedCells = useCallback(() => {
    if (!startCell || !currentCell) return [];

    const dx = currentCell.x - startCell.x;
    const dy = currentCell.y - startCell.y;

    const isHorizontal = dy === 0 && dx !== 0;
    const isVertical = dx === 0 && dy !== 0;
    const isDiagonal = Math.abs(dx) === Math.abs(dy) && dx !== 0;

    if (!isHorizontal && !isVertical && !isDiagonal) return [];

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

  /** Checks the current run against the word list and clears the selection. */
  const commitSelection = useCallback(() => {
    const selected = getSelectedCells();
    let matched: string | null = null;

    if (selected.length > 0) {
      const word = selected.map(c => c.letter).join('');
      const wordReversed = [...word].reverse().join('');

      const found = grid.placedWords.find(
        pw => (pw.word === word || pw.word === wordReversed) && !foundWords.includes(pw.word)
      );

      if (found) {
        matched = found.word;
        setFoundWords(prev => (prev.includes(found.word) ? prev : [...prev, found.word]));
      }
    }

    setStartCell(null);
    setCurrentCell(null);
    // Only report a real attempt; an incidental tap is not a miss.
    if (selected.length > 1) onResolveRef.current?.(matched);
    return matched;
  }, [getSelectedCells, grid.placedWords, foundWords]);

  const onPointerDown = (cell: GridCell) => {
    setStartCell(cell);
    setCurrentCell(cell);
    setFocus({ x: cell.x, y: cell.y });
  };

  const onPointerEnter = (cell: GridCell) => {
    if (startCell) {
      setCurrentCell(cell);
    }
  };

  const onPointerUp = () => {
    commitSelection();
  };

  // ------------------------------------------------------------- keyboard
  const moveFocus = useCallback(
    (dx: number, dy: number) => {
      const nx = Math.min(grid.width - 1, Math.max(0, focus.x + dx));
      const ny = Math.min(grid.height - 1, Math.max(0, focus.y + dy));
      setFocus({ x: nx, y: ny });
      // While a word is being built, moving the cursor extends the run.
      if (startCell) setCurrentCell(grid.cells[ny][nx]);
    },
    [focus.x, focus.y, grid, startCell]
  );

  /** Enter/Space: drop an anchor, or complete the word if one is open. */
  const toggleSelection = useCallback(() => {
    if (!startCell) {
      const cell = grid.cells[focus.y][focus.x];
      setStartCell(cell);
      setCurrentCell(cell);
      return null;
    }
    return commitSelection();
  }, [startCell, grid, focus.x, focus.y, commitSelection]);

  const cancelSelection = useCallback(() => {
    setStartCell(null);
    setCurrentCell(null);
  }, []);

  /**
   * Reveals the first letter of an unfound word and moves the cursor there.
   * Deliberately only the first letter — enough to break a deadlock without
   * solving the puzzle.
   */
  const useHint = useCallback(() => {
    const remaining = grid.placedWords.filter(pw => !foundWords.includes(pw.word));
    if (remaining.length === 0) return null;

    // Prefer a word that has not already been hinted.
    const target =
      remaining.find(pw => !hintedCells.has(`${pw.startX},${pw.startY}`)) ?? remaining[0];

    setHintedCells(prev => {
      const next = new Set(prev);
      next.add(`${target.startX},${target.startY}`);
      return next;
    });
    setHintsUsed(n => n + 1);
    setFocus({ x: target.startX, y: target.startY });
    return target.word;
  }, [grid.placedWords, foundWords, hintedCells]);

  return {
    grid,
    foundWords,
    selectedCells: getSelectedCells(),
    onPointerDown,
    onPointerEnter,
    onPointerUp,
    // Keyboard surface
    focus,
    setFocus,
    moveFocus,
    toggleSelection,
    cancelSelection,
    isSelecting: startCell !== null,
    // Hints
    hintedCells,
    hintsUsed,
    useHint,
    remainingCount: grid.placedWords.length - foundWords.length,
  };
}
