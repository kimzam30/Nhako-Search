'use client';

import { motion } from 'framer-motion';
import { GridCell } from '@/lib/puzzle/generator';
import { softBounce } from '@/components/motion/springs';

interface Props {
  cell: GridCell;
  /** Referenced by the grid's aria-activedescendant. */
  id: string;
  isFocused: boolean;
  isSelected: boolean;
  isHinted: boolean;
  onPointerDown: (cell: GridCell) => void;
  onPointerEnter: (cell: GridCell) => void;
}

export function LetterCell({ cell, id, isFocused, isSelected, isHinted, onPointerDown, onPointerEnter }: Props) {
  return (
    <motion.div
      id={id}
      role="gridcell"
      aria-colindex={cell.x + 1}
      aria-selected={isSelected}
      // Spelled out so a screen reader announces the letter rather than trying
      // to pronounce it as a word.
      aria-label={`${cell.letter}, row ${cell.y + 1} column ${cell.x + 1}`}
      whileTap={{ scale: 0.8 }}
      transition={softBounce}
      onPointerDown={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        onPointerDown(cell);
      }}
      onPointerEnter={() => onPointerEnter(cell)}
      data-x={cell.x}
      data-y={cell.y}
      data-focused={isFocused || undefined}
      className={`letter-cell w-full h-full min-w-0 min-h-0 flex items-center justify-center leading-none rounded-lg font-display font-bold select-none cursor-pointer touch-none text-ink hover:bg-surface/50 ${
        isFocused ? 'cell-cursor' : ''
      } ${isSelected ? 'bg-accent/20' : ''} ${isHinted ? 'ring-2 ring-gold ring-inset text-gold' : ''}`}
    >
      {cell.letter}
    </motion.div>
  );
}
