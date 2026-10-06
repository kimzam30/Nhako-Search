'use client';
import { useEffect, useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { THEME_ART } from '@/components/ui/Doodles';
import { CheckSvg, PlaySvg } from '@/components/ui/Icons';
import { THEMES } from '@/lib/words/themes';
import { readJournal } from '@/lib/rewards/journal';

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', detail: '8×8 · 6 words', dots: 1 },
  { id: 'medium', label: 'Medium', detail: '10×10 · 8 words', dots: 2 },
  { id: 'hard', label: 'Hard', detail: '13×13 · 10 words', dots: 3 },
];

const LAST_KEY = 'nhako_last_free_play';

export default function StandardSetupPage() {
  // Reopen on the theme and difficulty last played, like a game remembering
  // your loadout.
  const [theme, setTheme] = useState('standard');
  const [diff, setDiff] = useState('easy');
  const [played, setPlayed] = useState<string[]>([]);
  useEffect(() => {
    try {
      const last = JSON.parse(localStorage.getItem(LAST_KEY) || '{}') as { theme?: string; diff?: string };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (last.theme && THEMES.some(t => t.id === last.theme)) setTheme(last.theme);
      if (last.diff && DIFFICULTIES.some(d => d.id === last.diff)) setDiff(last.diff);
    } catch {
      /* first visit or blocked storage */
    }
    setPlayed(readJournal().themes);
  }, []);
  const remember = () => {
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify({ theme, diff }));
    } catch {
      /* private mode */
    }
  };

  return (
    <div className="flex flex-col w-full max-w-lg md:max-w-2xl mx-auto px-5 pb-48 short:pb-28" style={{ paddingTop: 'max(1.25rem, var(--safe-top))' }}>
      <h1 className="text-4xl font-display text-ink mb-1">Free play</h1>
      <p className="font-accent text-2xl text-ink-2 -rotate-1 mb-5">pick a page to fill</p>

      {/* Every theme visible at once, three across on a phone. A small dot marks
          the ones not yet cleared (the Explorer butterfly needs them all). */}
      <h2 id="theme-label" className="text-xs font-extrabold uppercase tracking-widest text-ink-2 mb-3">
        Theme
      </h2>
      <div role="radiogroup" aria-labelledby="theme-label" className="grid grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
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
              className={`press stagger-in relative h-[108px] flex flex-col items-center justify-center gap-1 text-center px-1.5 border-line transition-[box-shadow,transform] duration-150 ${
                selected ? 'border-[3px] shadow-[4px_5px_0_0_var(--line)] -rotate-1' : 'border-2 shadow-[2px_3px_0_0_var(--line)]'
              }`}
              style={{
                background: `color-mix(in srgb, ${t.hue} calc(30% * var(--tint-boost)), var(--surface))`,
                borderRadius: i % 2 ? '14px 22px 12px 20px' : '20px 12px 22px 14px',
                ['--i' as string]: i,
              }}
            >
              <Art className="w-12 h-12" />
              <span className="font-display font-bold text-ink text-sm leading-tight">{t.name}</span>
              {!played.includes(t.id) && (
                <span className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-accent border-2 border-line" aria-label="not played yet" />
              )}
              {selected && (
                <span className="nera-pop absolute -top-2.5 -right-2.5 w-7 h-7 flex items-center justify-center rounded-full border-2 border-line bg-accent text-on-accent">
                  <CheckSvg className="w-4 h-4" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Difficulty and the primary action pinned above the tab bar, where the
          thumb already is. Difficulty used to sit at the end of the scroll,
          below the fold on a phone, so most players never saw the choice. */}
      <div
        className="bottom-cta fixed left-0 right-0 rail:left-[calc(var(--rail-w)+var(--safe-left))] z-30 px-5 pb-3 pt-6 bg-gradient-to-t from-background via-background via-85% to-transparent"
      >
        <div className="max-w-lg md:max-w-2xl mx-auto flex flex-col short:flex-row gap-3">
          <div
            role="radiogroup"
            aria-label="Difficulty"
            className="short:flex-1 grid grid-cols-3 gap-1 p-1 bg-surface border-2 border-line rounded-[20px] shadow-[3px_4px_0_0_var(--line)]"
          >
            {DIFFICULTIES.map(d => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={diff === d.id}
                onClick={() => setDiff(d.id)}
                className={`press min-h-[52px] flex flex-col items-center justify-center rounded-2xl transition-colors ${
                  diff === d.id ? 'bg-accent text-on-accent' : 'text-ink'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="flex gap-0.5" aria-hidden="true">
                    {[0, 1, 2].map(n => (
                      <span key={n} className={`w-1.5 h-1.5 rounded-full ${n < d.dots ? (diff === d.id ? 'bg-on-accent' : 'bg-accent-ink') : 'bg-ink/15'}`} />
                    ))}
                  </span>
                  <span className="font-body font-extrabold">{d.label}</span>
                </span>
                <span className={`text-[11px] font-bold tabular ${diff === d.id ? 'text-on-accent' : 'text-ink-2'}`}>{d.detail}</span>
              </button>
            ))}
          </div>
          <ButtonLink href={`/play/standard/${theme}/${diff}`} onClick={remember} fullWidth className="text-xl py-4 short:w-auto short:shrink-0 short:px-8">
            <PlaySvg className="w-6 h-6" />
            Play
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
