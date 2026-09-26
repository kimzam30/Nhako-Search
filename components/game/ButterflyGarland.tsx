'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { DoodleButterfly } from '@/components/ui/Doodles';

interface Props {
  count: number;
  total: number;
  /** Wing colour per earned slot, in the order they were earned. */
  colors?: string[];
}

/*
 * The garland: a doodled string with one butterfly per word. Unearned slots
 * are faint outlines; an earned one lands with a pop in its word's colour.
 * Each slot carries data-slot so a found word's butterfly can fly to it.
 */
export const ButterflyGarland = forwardRef<HTMLDivElement, Props>(function ButterflyGarland(
  { count, total, colors },
  ref
) {
  return (
    <div
      ref={ref}
      className="relative flex items-center justify-center gap-1 h-10 w-full max-w-md px-2"
      role="img"
      aria-label={`${count} of ${total} words found`}
    >
      {/* The string. */}
      <svg aria-hidden="true" className="absolute inset-x-2 top-1 h-6 w-[calc(100%-1rem)]" viewBox="0 0 200 24" preserveAspectRatio="none">
        <path d="M0 4C40 18 80 20 100 18C120 20 160 18 200 4" fill="none" stroke="var(--line)" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      </svg>
      {Array.from({ length: total }).map((_, i) => {
        const isEarned = i < count;
        const wing = colors?.[i] ?? 'var(--word-1)';
        return (
          <motion.div
            key={i}
            data-slot={i}
            initial={false}
            animate={isEarned ? { scale: [0.2, 1.3, 1], rotate: [0, -12, 0], opacity: 1 } : { scale: 1, rotate: 0, opacity: 0.35 }}
            transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
            className="relative flex items-center justify-center w-7 shrink min-w-0"
          >
            {isEarned ? (
              <DoodleButterfly className="w-7" wing={wing} wing2="var(--lav)" />
            ) : (
              <DoodleButterfly className="w-6" wing="transparent" wing2="transparent" stroke="var(--ink-2)" />
            )}
          </motion.div>
        );
      })}
    </div>
  );
});
