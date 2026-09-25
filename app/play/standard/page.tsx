'use client';
import { useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';

const THEMES = [
  { id: 'standard', name: 'Mixed pack', color: 'bg-surface' },
  { id: 'garden', name: 'Garden', color: 'bg-[#7FCB9C]/30' },
  { id: 'rainy-day', name: 'Rainy day', color: 'bg-[#FFD166]/30' },
  { id: 'cozy-cottage', name: 'Cozy cottage', color: 'bg-[#FFC1D9]/40' },
  { id: 'night-sky', name: 'Night sky', color: 'bg-[#4A1942]/10 dark:bg-[#4A1942]/60' },
  { id: 'date-night', name: 'Date night', color: 'bg-[#FF6FA5]/30' },
];

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', detail: '8×8 · 6 words' },
  { id: 'medium', label: 'Medium', detail: '10×10 · 8 words' },
  { id: 'hard', label: 'Hard', detail: '13×13 · 10 words' },
];

export default function StandardSetupPage() {
  const [theme, setTheme] = useState('standard');
  const [diff, setDiff] = useState('easy');

  return (
    <div className="flex flex-col w-full max-w-lg md:max-w-2xl mx-auto px-5 pb-28" style={{ paddingTop: 'max(1.25rem, var(--safe-top))' }}>
      <h1 className="text-4xl font-display text-ink mb-6">Free play</h1>

      {/* All six themes visible at once. The old sideways strip hid half of
          them behind a pulsing "scroll for more" hint. */}
      <h2 id="theme-label" className="text-xs font-extrabold uppercase tracking-widest text-ink-2 mb-3">
        Theme
      </h2>
      <div role="radiogroup" aria-labelledby="theme-label" className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {THEMES.map(t => {
          const selected = theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(t.id)}
              className={`press h-24 flex items-center justify-center text-center px-3 border-ink ${t.color} ${
                selected ? 'border-[3px] shadow-[4px_5px_0_0_var(--ink)]' : 'border-2 border-ink/40'
              }`}
              style={{ borderRadius: '15px 225px 15px 255px/255px 15px 225px 15px' }}
            >
              <span className="font-display font-bold text-ink text-lg leading-tight">{t.name}</span>
            </button>
          );
        })}
      </div>

      <h2 id="difficulty-label" className="text-xs font-extrabold uppercase tracking-widest text-ink-2 mb-3">
        Difficulty
      </h2>
      <div
        role="radiogroup"
        aria-labelledby="difficulty-label"
        className="grid grid-cols-3 gap-1 p-1 bg-surface border-2 border-ink rounded-[20px] shadow-[4px_5px_0_0_var(--ink)]"
      >
        {DIFFICULTIES.map(d => (
          <button
            key={d.id}
            type="button"
            role="radio"
            aria-checked={diff === d.id}
            onClick={() => setDiff(d.id)}
            className={`press min-h-[56px] flex flex-col items-center justify-center rounded-2xl transition-colors ${
              diff === d.id ? 'bg-accent text-on-accent' : 'text-ink'
            }`}
          >
            <span className="font-body font-extrabold">{d.label}</span>
            <span className={`text-[11px] font-bold tabular ${diff === d.id ? 'text-on-accent' : 'text-ink-2'}`}>{d.detail}</span>
          </button>
        ))}
      </div>

      {/* Primary action pinned above the tab bar, where the thumb already is. */}
      <div
        className="bottom-cta fixed left-0 right-0 lg:left-[var(--rail-w)] z-30 px-5 pb-3 pt-3 bg-gradient-to-t from-background via-background to-transparent"
      >
        <div className="max-w-lg md:max-w-2xl mx-auto">
          <ButtonLink href={`/play/standard/${theme}/${diff}`} fullWidth className="text-xl py-4">
            Start puzzle
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
