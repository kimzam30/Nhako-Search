'use client';

import { motion } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';

interface Props {
  words: { word: string; found: boolean }[];
}

export function WordList({ words }: Props) {
  return (
    <div className="flex flex-wrap gap-3 justify-center mt-6 w-full px-4">
      {words.map((w, i) => (
        <motion.div
          key={w.word}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, ...softBounce }}
          className={`
            relative px-4 py-2 font-display text-lg sm:text-xl font-bold transition-all duration-300
            ${w.found ? 'text-ink/40' : 'text-ink'}
          `}
        >
          {w.word}
          {w.found && (
            <motion.div 
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ originX: 0 }}
              className="absolute left-2 right-2 top-1/2 h-1 bg-ink/50 rounded-full"
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}
