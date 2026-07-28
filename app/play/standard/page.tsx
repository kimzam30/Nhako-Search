'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const THEMES = [
  { id: 'standard', name: 'Mixed Pack', color: 'bg-surface' },
  { id: 'garden', name: 'Garden', color: 'bg-[#7FCB9C]/30' },
  { id: 'rainy-day', name: 'Rainy Day', color: 'bg-[#FFD166]/30' },
  { id: 'cozy-cottage', name: 'Cozy Cottage', color: 'bg-[#FFC1D9]/30' },
  { id: 'night-sky', name: 'Night Sky', color: 'bg-[#4A1942]/10' },
  { id: 'date-night', name: 'Date Night', color: 'bg-[#FF6FA5]/30' }
];

export default function StandardSetupPage() {
  const [theme, setTheme] = useState('standard');
  const [diff, setDiff] = useState('easy');

  return (
    <div className="flex flex-col items-center flex-1 p-6 bg-transparent w-full max-w-lg mx-auto">
      <h1 className="text-3xl font-display text-ink mb-8">Free Play</h1>
      
      <div className="w-full mb-8 relative">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-bold font-body text-ink">Choose a Theme</h2>
          <motion.span 
            animate={{ opacity: [0.4, 0.8, 0.4], x: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="text-[10px] font-bold text-ink/50 uppercase tracking-widest pb-1"
          >
            Scroll for more →
          </motion.span>
        </div>
        
        <div className="relative -mx-6 px-6">
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
            {THEMES.map(t => (
              <motion.div 
                key={t.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTheme(t.id)}
                className="snap-center shrink-0 w-40"
              >
                <Card 
                  className={`h-32 flex items-center justify-center text-center cursor-pointer transition-all ${t.color} ${theme === t.id ? 'border-4' : 'border-2 opacity-60'}`}
                  style={{ borderRadius: '15px 225px 15px 255px/255px 15px 225px 15px' }}
                  noShadow={theme !== t.id}
                >
                  <span className="font-display font-bold text-ink text-xl">{t.name}</span>
                </Card>
              </motion.div>
            ))}
          </div>
          {/* Gradient Edge */}
          <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        </div>
      </div>

      <div className="w-full mb-12">
        <h2 className="text-lg font-bold font-body text-ink mb-4">Difficulty</h2>
        <div className="flex bg-surface border-2 border-ink rounded-[20px] p-1 shadow-[4px_5px_0_0_var(--ink)]">
          {['easy', 'medium', 'hard'].map(d => (
            <button
              key={d}
              onClick={() => setDiff(d)}
              className={`flex-1 py-3 text-center rounded-xl font-bold font-body capitalize transition-colors ${diff === d ? 'bg-accent text-ink shadow-sm' : 'text-ink/60 hover:bg-white/50'}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <Link href={`/play/standard/${theme}/${diff}`} className="w-full mt-auto mb-20">
        <Button variant="primary" fullWidth className="text-xl py-4 shadow-[4px_5px_0_0_var(--ink)]">
          Start Puzzle
        </Button>
      </Link>
    </div>
  );
}
