'use client';

import { motion } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';

interface Props {
  words: { word: string; found: boolean }[];
}

export function WordList({ words }: Props) {
  return (
    <div className="flex flex-row overflow-x-auto whitespace-nowrap gap-3 mt-4 mb-6 w-full px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {/* For Webkit scrollbar hiding, it can be handled globally or we just use inline if possible, but scrollbarWidth: none covers Firefox. Let's add a global class if needed, or rely on standard tailwind hide-scrollbar if configured. For now inline is fine. */}
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
