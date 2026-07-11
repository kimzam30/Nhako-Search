'use client';

import { motion } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';

interface Props {
  words: { word: string; found: boolean }[];
}

export function WordList({ words }: Props) {
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-6">
      {words.map((w, i) => (
        <motion.div
          key={w.word}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, ...softBounce }}
          className={`
            px-4 py-2 rounded-full font-body text-sm sm:text-base border-2 transition-all duration-300
            ${w.found 
              ? 'bg-found/20 border-found text-ink line-through opacity-60' 
              : 'bg-surface border-accent-soft text-ink'}
          `}
        >
          {w.word}
        </motion.div>
      ))}
    </div>
  );
}
