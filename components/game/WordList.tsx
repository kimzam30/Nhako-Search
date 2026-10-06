'use client';

import { motion } from 'framer-motion';
import { CheckSvg } from '@/components/ui/Icons';

interface Props {
  /** `color` is the word's capsule colour on the board. */
  words: { word: string; found: boolean; color?: string }[];
}

/*
 * The word bank: a tray of chips, like the bank under a shipping word-search
 * board. A found chip fills with its capsule's colour and gets a tick, so the
 * list and the board point at each other; the tick and strike mean it never
 * relies on colour alone.
 */
export function WordList({ words }: Props) {
  return (
    <ul
      data-no-fly
      className="flex flex-wrap justify-center content-start gap-1.5 sm:gap-2 short:gap-1.5 w-full p-2.5 sm:p-3 short:p-2 bg-surface border-2 border-line shadow-[3px_4px_0_0_var(--line)]"
      style={{ borderRadius: '16px 12px 18px 10px' }}
      aria-label="Words to find"
    >
      {words.map((w, i) => (
        <motion.li
          key={w.word}
          data-found={w.found || undefined}
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={w.found ? { opacity: 1, y: 0, scale: [1, 1.14, 1] } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: w.found ? 0.25 : 0.2 + i * 0.04, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className={`relative flex items-center h-8 short:h-7 px-2.5 sm:px-3 rounded-full border-2 font-display font-bold text-sm sm:text-base short:text-sm tracking-wide transition-colors duration-200 ${
            w.found ? 'border-line text-on-accent line-through decoration-2' : 'border-ink/25 bg-tile text-ink'
          }`}
          style={w.found ? { backgroundColor: w.color ?? 'var(--found)' } : undefined}
        >
          {w.word}
          {/* The tick is a corner badge, not inline: a chip that grew when
              found re-wrapped the tray and shifted the board mid-game. */}
          {w.found && (
            <motion.span
              className="absolute -top-2 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full border-2 border-line bg-tile text-ink"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.38, type: 'spring', stiffness: 600, damping: 16 }}
            >
              <CheckSvg className="w-3 h-3" />
            </motion.span>
          )}
          {w.found && <span className="sr-only"> (found)</span>}
        </motion.li>
      ))}
    </ul>
  );
}
