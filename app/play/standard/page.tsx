'use client';
import { useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { THEME_ART } from '@/components/ui/Doodles';
import { CheckSvg, PlaySvg } from '@/components/ui/Icons';

const THEMES = [
  { id: 'standard', name: 'Mixed pack', tint: 'var(--lav-soft)' },
  { id: 'garden', name: 'Garden', tint: 'color-mix(in srgb, var(--word-3) calc(30% * var(--tint-boost)), var(--surface))' },
  { id: 'rainy-day', name: 'Rainy day', tint: 'color-mix(in srgb, var(--word-5) calc(30% * var(--tint-boost)), var(--surface))' },
  { id: 'cozy-cottage', name: 'Cozy cottage', tint: 'color-mix(in srgb, var(--word-6) calc(28% * var(--tint-boost)), var(--surface))' },
  { id: 'night-sky', name: 'Night sky', tint: 'color-mix(in srgb, var(--word-2) calc(30% * var(--tint-boost)), var(--surface))' },
  { id: 'date-night', name: 'Date night', tint: 'color-mix(in srgb, var(--word-1) calc(30% * var(--tint-boost)), var(--surface))' },
];

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', detail: '8×8 · 6 words', dots: 1 },
  { id: 'medium', label: 'Medium', detail: '10×10 · 8 words', dots: 2 },
  { id: 'hard', label: 'Hard', detail: '13×13 · 10 words', dots: 3 },
];

export default function StandardSetupPage() {
  const [theme, setTheme] = useState('standard');
  const [diff, setDiff] = useState('easy');

  return (
    <div className="flex flex-col w-full max-w-lg md:max-w-2xl mx-auto px-5 pb-28" style={{ paddingTop: 'max(1.25rem, var(--safe-top))' }}>
      <h1 className="text-4xl font-display text-ink mb-1">Free play</h1>
      <p className="font-accent text-2xl text-ink-2 -rotate-1 mb-5">pick a page to fill</p>

      {/* All six themes visible at once. The old sideways strip hid half of
          them behind a pulsing "scroll for more" hint. */}
      <h2 id="theme-label" className="text-xs font-extrabold uppercase tracking-widest text-ink-2 mb-3">
        Theme
      </h2>
      <div role="radiogroup" aria-labelledby="theme-label" className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {THEMES.map((t, i) => {
          const selected = theme === t.id;
          const Art = THEME_ART[t.id];
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(t.id)}
              className={`press stagger-in relative h-[118px] flex flex-col items-center justify-center gap-1 text-center px-2 border-line transition-[box-shadow,transform] duration-150 ${
                selected ? 'border-[3px] shadow-[4px_5px_0_0_var(--line)] -rotate-1' : 'border-2 shadow-[2px_3px_0_0_var(--line)]'
              }`}
              style={{ background: t.tint, borderRadius: i % 2 ? '14px 22px 12px 20px' : '20px 12px 22px 14px', ['--i' as string]: i }}
            >
              <Art className="w-14 h-14" />
              <span className="font-display font-bold text-ink text-base leading-tight">{t.name}</span>
              {selected && (
                <span className="nera-pop absolute -top-2.5 -right-2.5 w-7 h-7 flex items-center justify-center rounded-full border-2 border-line bg-accent text-on-accent">
                  <CheckSvg className="w-4 h-4" />
                </span>
              )}
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
        className="grid grid-cols-3 gap-1 p-1 bg-surface border-2 border-line rounded-[20px] shadow-[4px_5px_0_0_var(--line)]"
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
            <span className="flex gap-0.5 mb-0.5" aria-hidden="true">
              {[0, 1, 2].map(n => (
                <span key={n} className={`w-1.5 h-1.5 rounded-full ${n < d.dots ? (diff === d.id ? 'bg-on-accent' : 'bg-accent-ink') : 'bg-ink/15'}`} />
              ))}
            </span>
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
            <PlaySvg className="w-6 h-6" />
            Start puzzle
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
