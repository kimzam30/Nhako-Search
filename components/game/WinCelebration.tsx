'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { StarSvg, ClockSvg, WandSvg } from '@/components/ui/Icons';
import { DoodleButterfly } from '@/components/ui/Doodles';
import { Petals } from '@/components/game/Petals';
import { useAmbientAudio } from '@/components/sound/AmbientAudioProvider';

interface Props {
  title: string;
  stars: number;
  seconds: number;
  words: number;
  hints: number;
  children: React.ReactNode;
}

/*
 * The level-complete moment, built like a shipping puzzle game's:
 * ribbon banner, three stars popping in one at a time (middle one raised and
 * bigger) with a rising bell each, a stats strip, petals falling, and the next
 * action as a big button. The window opens in NeraOS's three stepped frames.
 */
export function WinCelebration({ title, stars, seconds, words, hints, children }: Props) {
  const { playSfx } = useAmbientAudio();

  // Each earned star rings as it lands; timed to the pop delays below.
  useEffect(() => {
    const timers = Array.from({ length: stars }, (_, i) => window.setTimeout(() => playSfx('star', i), 420 + i * 280));
    return () => timers.forEach(t => window.clearTimeout(t));
  }, [stars, playSfx]);

  const time = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="presentation">
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        aria-hidden="true"
      />
      <Petals />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="win-title"
        className="nera-open relative z-[71] bg-surface w-full sm:max-w-sm border-2 border-line rounded-t-[28px] sm:rounded-[28px] px-6 pt-12 flex flex-col items-center gap-4 text-center shadow-[4px_5px_0_0_var(--line)]"
        style={{ paddingBottom: 'max(1.5rem, calc(var(--safe-bottom) + 1.25rem))' }}
      >
        {/* Ribbon banner straddling the top edge. */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-[min(320px,92%)]">
          <svg viewBox="0 0 320 64" className="w-full h-auto" aria-hidden="true">
            <g stroke="var(--line)" strokeWidth="2.5" strokeLinejoin="round">
              <path d="M4 18H44V56H4L16 37Z" fill="var(--accent-soft)" />
              <path d="M316 18H276V56H316L304 37Z" fill="var(--accent-soft)" />
              <path d="M34 8C110 2 210 2 286 8V48C210 42 110 42 34 48Z" fill="var(--accent)" />
            </g>
          </svg>
          <h2
            id="win-title"
            className="absolute inset-0 flex items-center justify-center pb-2 font-display font-bold text-xl text-on-accent"
          >
            {title}
          </h2>
        </div>

        <div className="flex items-end justify-center gap-1" role="img" aria-label={`${stars} of 3 stars`}>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: i === 0 ? -10 : i === 2 ? 10 : 0 }}
              transition={{ delay: 0.4 + i * 0.28, type: 'spring', stiffness: 420, damping: 13 }}
              className={`${i === 1 ? 'mb-4' : ''} ${i < stars ? 'text-gold' : 'text-ink/15'}`}
            >
              <StarSvg className={i === 1 ? 'w-20 h-20' : 'w-14 h-14'} filled={i < stars} />
            </motion.div>
          ))}
        </div>

        {/* The NeraOS boot bar sweeping full: the level is "installed". */}
        <div className="nera-track w-full" aria-hidden="true">
          <motion.div
            className="nera-fill"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ delay: 0.2, duration: 0.6, ease: (t: number) => Math.ceil(t * 6) / 6 }}
          />
        </div>

        <dl className="grid grid-cols-3 gap-2 w-full">
          {[
            { label: 'Time', value: time, icon: <ClockSvg className="w-4 h-4" /> },
            { label: 'Words', value: String(words), icon: <DoodleButterfly className="w-5" /> },
            { label: 'Hints', value: String(hints), icon: <WandSvg className="w-4 h-4" /> },
          ].map(s => (
            <div key={s.label} className="flex flex-col-reverse items-center gap-0.5 py-2 rounded-2xl bg-background border-2 border-ink/15">
              <dt className="text-[11px] font-extrabold uppercase tracking-wider text-ink-2">{s.label}</dt>
              <dd className="flex items-center gap-1 font-display font-bold text-lg text-ink tabular">
                {s.icon}
                {s.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-3 w-full mt-1">{children}</div>
      </div>
    </div>
  );
}
