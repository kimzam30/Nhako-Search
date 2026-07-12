'use client';

import { motion } from 'framer-motion';
import { GridCell } from '@/lib/puzzle/generator';
import { softBounce } from '@/components/motion/springs';

interface Props {
  cell: GridCell;
  onPointerDown: (cell: GridCell) => void;
  onPointerEnter: (cell: GridCell) => void;
}

export function LetterCell({ cell, onPointerDown, onPointerEnter }: Props) {
  return (
    <motion.div
      whileTap={{ scale: 0.8 }}
      transition={softBounce}
      onPointerDown={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        onPointerDown(cell);
      }}
      onPointerEnter={() => onPointerEnter(cell)}
      data-x={cell.x}
      data-y={cell.y}
      className="w-full h-full flex items-center justify-center rounded-lg text-[clamp(14px,3.5vmin,24px)] font-display font-bold select-none cursor-pointer touch-none text-ink hover:bg-surface/50"
    >
      {cell.letter}
    </motion.div>
  );
}
