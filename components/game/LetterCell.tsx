'use client';

import { motion } from 'framer-motion';
import { GridCell } from '@/lib/puzzle/generator';

interface Props {
  cell: GridCell;
  /** Referenced by the grid's aria-activedescendant. */
  id: string;
  isFocused: boolean;
  isSelected: boolean;
  isHinted: boolean;
  /** Sits on a found word's capsule: dark letters, so they read on the pastel. */
  onCapsule?: boolean;
  /** Position in the word that just landed; the letters pop in trace order. */
  popIndex?: number;
}

/*
 * A letter on the notebook board.
 *
 * Pointer input is handled by the board (GridBoard hit-tests by geometry).
 *
 * Feedback follows shipping word-search games: a letter lifts as the finger
 * passes over it (scale on the selection, not on tap, so it tracks the drag),
 * and when a word lands its letters pop one after another along the capsule.
 * Letters on a capsule switch to --on-accent: the ink token is near-white in
 * dark mode and would vanish on the pastel.
 */
export function LetterCell({
  cell,
  id,
  isFocused,
  isSelected,
  isHinted,
  onCapsule = false,
  popIndex,
}: Props) {
  const popping = popIndex !== undefined;
  return (
    <motion.div
      id={id}
      role="gridcell"
      aria-colindex={cell.x + 1}
      aria-selected={isSelected}
      // Spelled out so a screen reader announces the letter rather than trying
      // to pronounce it as a word.
      aria-label={`${cell.letter}, row ${cell.y + 1} column ${cell.x + 1}`}
      initial={popping ? { scale: 1 } : false}
      animate={
        popping
          ? { scale: [1, 1.38, 1], transition: { delay: popIndex * 0.045, duration: 0.34, ease: [0.23, 1, 0.32, 1] } }
          : { scale: isSelected ? 1.22 : 1, transition: { type: 'spring', stiffness: 600, damping: 26 } }
      }
      data-x={cell.x}
      data-y={cell.y}
      data-focused={isFocused || undefined}
      className={`letter-cell w-full h-full min-w-0 min-h-0 flex items-center justify-center leading-none rounded-lg font-display font-bold select-none cursor-pointer touch-none ${
        isSelected || onCapsule ? 'text-on-accent' : isHinted ? 'text-accent-ink' : 'text-ink'
      } ${isFocused ? 'cell-cursor' : ''} ${isHinted && !onCapsule && !isSelected ? 'bg-gold/40 ring-2 ring-gold ring-inset' : ''}`}
    >
      {cell.letter}
    </motion.div>
  );
}
