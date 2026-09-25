'use client';

import { motion } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';

interface Props {
  words: { word: string; found: boolean }[];
}

export function WordList({ words }: Props) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-1.5 gap-y-1 sm:gap-2 mt-2 mb-2 w-full px-2 sm:px-4" aria-label="Words to find">
      {words.map((w, i) => (
        <motion.li
          key={w.word}
          data-found={w.found || undefined}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, ...softBounce }}
          className={`
            relative px-2 sm:px-3 py-1 font-display text-base sm:text-lg font-bold transition-all duration-300
            ${w.found ? 'text-ink-2' : 'text-ink'}
          `}
        >
          {w.word}
          {w.found && <span className="sr-only"> (found)</span>}
          {w.found && (
            <motion.div 
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ originX: 0 }}
              className="absolute left-2 right-2 top-1/2 h-1 bg-ink/50 rounded-full"
            />
          )}
        </motion.li>
      ))}
    </ul>
  );
}
