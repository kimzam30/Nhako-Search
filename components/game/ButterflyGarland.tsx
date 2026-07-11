'use client';

import { motion } from 'framer-motion';
import { ButterflySvg } from '@/components/ui/Icons';
import { softBounce } from '@/components/motion/springs';

interface Props {
  count: number;
  total: number;
}

export function ButterflyGarland({ count, total }: Props) {
  return (
    <div className="flex items-center justify-center gap-2 mb-4 h-12 w-full max-w-sm border-b-2 border-dashed border-ink/20 pb-2">
      {Array.from({ length: total }).map((_, i) => {
        const isEarned = i < count;
        return (
          <motion.div
            key={i}
            initial={false}
            animate={{ 
              scale: isEarned ? [0, 1.2, 1] : 1,
              opacity: isEarned ? 1 : 0.2
            }}
            transition={softBounce}
            className={`flex items-center justify-center ${isEarned ? 'text-accent' : 'text-ink grayscale'}`}
          >
            <ButterflySvg className="w-6 h-6" />
          </motion.div>
        );
      })}
    </div>
  );
}
