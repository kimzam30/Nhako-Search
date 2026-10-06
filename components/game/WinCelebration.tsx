'use client';

import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { StarSvg, ClockSvg, WandSvg, TokenSvg } from '@/components/ui/Icons';
import type { RewardLine } from '@/lib/rewards/economy';
import type { ToastItem } from '@/components/ui/Toast';
import { DoodleButterfly } from '@/components/ui/Doodles';
import { Petals } from '@/components/game/Petals';
import { useAmbientAudio } from '@/components/sound/AmbientAudioProvider';

interface Props {
  title: string;
  stars: number;
  seconds: number;
  words: number;
  hints: number;
  /** Tokens earned, line by line; null while the result is still saving. */
  rewards?: RewardLine[] | null;
  /** Butterflies caught by this win, held back from the toasts (see Toast). */
  caught?: ToastItem[];
  /** Seconds added by free hints (already included in `seconds`). */
  penalty?: number;
  children: React.ReactNode;
}

/*
 * The level-complete moment, built like a shipping puzzle game's:
 * ribbon banner, three stars popping in one at a time (middle one raised and
 * bigger) with a rising bell each, a stats strip, petals falling, and the next
 * action as a big button. The window opens in NeraOS's three stepped frames.
 */
export function WinCelebration({ title, stars, seconds, words, hints, rewards, caught = [], penalty = 0, children }: Props) {
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

        {penalty > 0 && (
          <p className="-mt-2 text-xs font-extrabold text-ink-2 tabular">includes +{penalty}s from free hints</p>
        )}

        {/* Tokens earned: lines tick in, then the total. */}
        <div className="w-full min-h-[58px]" aria-live="polite">
          {rewards && rewards.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="flex items-center justify-between gap-3 w-full px-3 py-2 rounded-2xl border-2 border-line bg-accent-soft"
            >
              <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-left text-xs font-extrabold text-ink-2">
                {rewards.map((r, i) => (
                  <motion.li
                    key={r.label}
                    className="tabular"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + i * 0.12, duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                  >
                    {r.label} +{r.amount}
                  </motion.li>
                ))}
              </ul>
              <span className="shrink-0 flex items-center gap-1 font-display font-bold text-2xl text-ink tabular">
                <TokenSvg className="w-7 h-7 token-bump" />+<CountUp to={rewards.reduce((n, r) => n + r.amount, 0)} delay={1} />
              </span>
            </motion.div>
          )}
        </div>

        {/* New butterflies land here, not as toasts piled over the board. One
            row however many there are, so the sheet still fits a short phone. */}
        {caught.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="w-full -mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border-2 border-line bg-lav-soft text-left"
            aria-live="polite"
          >
            <span className="shrink-0 flex -space-x-3" aria-hidden="true">
              {caught.slice(0, 4).map(c => (
                <span key={c.id} className="w-9 h-9 flex items-center justify-center [&>*]:!w-9">
                  {c.icon}
                </span>
              ))}
            </span>
            <span className="min-w-0 flex flex-col leading-tight">
              <span className="font-display font-bold text-sm text-ink truncate">
                {caught.length === 1 ? caught[0].title : `${caught.length} new butterflies`}
              </span>
              {caught.length > 1 && (
                <span className="text-xs font-extrabold text-ink-2 truncate">
                  {caught.map(c => c.title.replace(/^New butterfly: /, '')).join(', ')}
                </span>
              )}
            </span>
          </motion.div>
        )}

        <div className="flex flex-col gap-3 w-full mt-1">{children}</div>
      </div>
    </div>
  );
}

/** The token total counts up as the reward lines land, then settles. */
function CountUp({ to, delay }: { to: number; delay: number }) {
  const value = useMotionValue(0);
  const text = useTransform(value, v => String(Math.round(v)));
  useEffect(() => {
    const controls = animate(value, to, { delay, duration: 0.7, ease: [0.23, 1, 0.32, 1] });
    return () => controls.stop();
  }, [to, delay, value]);
  return <motion.span>{text}</motion.span>;
}
