'use client';

import { motion } from 'framer-motion';
import { GridCell } from '@/lib/puzzle/generator';
import { softBounce } from '@/components/motion/springs';

interface Props {
  cell: GridCell;
  isSelected: boolean;
  isFound: boolean;
  onPointerDown: (cell: GridCell) => void;
  onPointerEnter: (cell: GridCell) => void;
}

export function LetterCell({ cell, isSelected, isFound, onPointerDown, onPointerEnter }: Props) {
  return (
    <motion.div
      whileTap={{ scale: 0.8 }}
      transition={softBounce}
      onPointerDown={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        onPointerDown(cell);
      }}
      onPointerEnter={() => onPointerEnter(cell)}
      className={`
        w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 
        flex items-center justify-center rounded-lg 
        text-lg sm:text-xl font-display font-bold select-none cursor-pointer touch-none
        ${isSelected ? 'bg-accent text-ink scale-110 shadow-sm' : ''}
        ${isFound && !isSelected ? 'text-found bg-found/20 opacity-80' : ''}
        ${!isSelected && !isFound ? 'text-ink hover:bg-surface' : ''}
      `}
    >
      {cell.letter}
    </motion.div>
  );
}
