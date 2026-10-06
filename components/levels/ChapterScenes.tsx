'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import type { ChapterTheme } from '@/lib/levels/data';
import s from './ChapterScenes.module.css';

/*
 * The level map's backdrop: one animated scene per chapter theme, fixed
 * behind the map, crossfading as you scroll from one chapter into the next.
 *
 * Only the visible scene (and the one fading out) is mounted, every moving
 * part animates transform/opacity only, and reduced motion freezes them all
 * (see the module CSS). Positions come from a fixed hash, not Math.random, so
 * the server and client render the same scene.
 */

/** Stable 0..1 from an index and a salt. */
const r = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/*
 * Inline style vars, with every number cut to two decimals: the server and
 * the browser printed the long floats differently, which React reported as a
 * hydration mismatch on the level map.
 */
const round = (n: number) => Math.round(n * 100) / 100;
const vars = (v: Record<string, string | number>) =>
  Object.fromEntries(
    Object.entries(v).map(([k, val]) => [k, typeof val === 'number' ? round(val) : val.replace(/-?\d+\.\d+/g, m => String(round(Number(m))))])
  ) as CSSProperties;

function Garden() {
  return (
    <>
      <span className={s.sun} />
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className={s.petalFall}
          style={vars({ '--x': `${r(i, 1) * 100}%`, '--dur': `${14 + r(i, 2) * 10}s`, '--delay': `${-r(i, 3) * 20}s` })}
        >
          <span className={s.petal} style={vars({ '--c': `var(--word-${[1, 7, 4][i % 3]})`, '--sway': `${3 + r(i, 4) * 3}s` })} />
        </span>
      ))}
      <svg className={s.hills} viewBox="0 0 400 120" preserveAspectRatio="none">
        <path d="M0 70 Q80 30 170 62 T400 52 V120 H0Z" className={s.hillBack} />
        <path d="M0 92 Q110 58 220 88 T400 80 V120 H0Z" className={s.hillFront} />
      </svg>
      <div className={s.meadow}>
        {Array.from({ length: 22 }, (_, i) => (
          <span
            key={i}
            className={s.blade}
            style={vars({
              left: `${(i / 22) * 100 + r(i, 5) * 3}%`,
              height: `${26 + r(i, 6) * 34}px`,
              '--sway': `${2.6 + r(i, 7) * 2}s`,
              '--delay': `${-r(i, 8) * 3}s`,
            })}
          />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={`f${i}`}
            className={s.flower}
            style={vars({ left: `${8 + i * 16 + r(i, 9) * 6}%`, '--c': `var(--word-${[1, 2, 4, 7, 6, 1][i]})`, '--delay': `${-r(i, 10) * 4}s` })}
          />
        ))}
      </div>
    </>
  );
}

function Rainy() {
  return (
    <>
      {Array.from({ length: 3 }, (_, i) => (
        <span
          key={`c${i}`}
          className={s.cloud}
          style={vars({ top: `${6 + i * 13}%`, '--dur': `${70 + i * 25}s`, '--delay': `${-i * 30}s`, '--scale': 1 - i * 0.18 })}
        />
      ))}
      {Array.from({ length: 46 }, (_, i) => (
        <span
          key={i}
          className={s.drop}
          style={vars({ left: `${r(i, 11) * 108 - 4}%`, '--dur': `${0.9 + r(i, 12) * 0.7}s`, '--delay': `${-r(i, 13) * 2}s`, '--len': `${14 + r(i, 14) * 16}px` })}
        />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={`p${i}`}
          className={s.ripple}
          style={vars({ left: `${10 + i * 19 + r(i, 15) * 6}%`, bottom: `${3 + r(i, 16) * 9}%`, '--delay': `${-r(i, 17) * 3}s` })}
        />
      ))}
    </>
  );
}

function Cottage() {
  return (
    <>
      <span className={s.windowGlow} />
      {Array.from({ length: 3 }, (_, i) => (
        <svg key={`s${i}`} className={s.steam} viewBox="0 0 20 80" style={vars({ left: `${22 + i * 26}%`, '--delay': `${-i * 2.4}s` })}>
          <path d="M10 78 C2 62 18 52 10 38 S2 14 10 2" />
        </svg>
      ))}
      {Array.from({ length: 20 }, (_, i) => (
        <span
          key={i}
          className={s.mote}
          style={vars({ left: `${r(i, 18) * 100}%`, '--dur': `${10 + r(i, 19) * 9}s`, '--delay': `${-r(i, 20) * 18}s`, '--size': `${3 + r(i, 21) * 5}px` })}
        />
      ))}
    </>
  );
}

function Night() {
  return (
    <>
      <span className={s.moon} />
      {Array.from({ length: 34 }, (_, i) => (
        <span
          key={i}
          className={s.star}
          style={vars({
            left: `${r(i, 22) * 100}%`,
            top: `${r(i, 23) * 80}%`,
            '--size': `${2 + r(i, 24) * 4}px`,
            '--dur': `${2.2 + r(i, 25) * 3}s`,
            '--delay': `${-r(i, 26) * 4}s`,
          })}
        />
      ))}
      <span className={s.shooting} />
      <span className={s.shooting} style={vars({ '--delay': '-6.5s', top: '34%' })} />
    </>
  );
}

function DateNight() {
  return (
    <>
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className={s.bokeh}
          style={vars({
            left: `${r(i, 27) * 100}%`,
            top: `${r(i, 28) * 100}%`,
            '--size': `${60 + r(i, 29) * 110}px`,
            '--c': `var(--word-${[1, 7, 4][i % 3]})`,
            '--dur': `${16 + r(i, 30) * 12}s`,
            '--delay': `${-r(i, 31) * 16}s`,
          })}
        />
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={`h${i}`}
          className={s.heartRise}
          style={vars({ left: `${r(i, 32) * 100}%`, '--dur': `${11 + r(i, 33) * 8}s`, '--delay': `${-r(i, 34) * 18}s` })}
        >
          <span className={s.heart} style={vars({ '--k': 0.45 + r(i, 35) * 0.5, '--sway': `${2.5 + r(i, 36) * 2}s` })} />
        </span>
      ))}
    </>
  );
}

const LETTERS = 'NHAKOWORDSEARCH';

function Notebook() {
  return (
    <>
      <span className={s.grid} />
      {Array.from({ length: 11 }, (_, i) => (
        <span
          key={i}
          className={s.tile}
          style={vars({
            left: `${4 + r(i, 37) * 88}%`,
            top: `${4 + r(i, 38) * 88}%`,
            '--rot': `${(r(i, 39) - 0.5) * 24}deg`,
            '--dur': `${5 + r(i, 40) * 4}s`,
            '--delay': `${-r(i, 41) * 6}s`,
            '--c': `var(--word-${(i % 8) + 1})`,
          })}
        >
          {LETTERS[i % LETTERS.length]}
        </span>
      ))}
    </>
  );
}

const SCENES: Record<ChapterTheme, () => ReactNode> = {
  garden: Garden,
  rainy: Rainy,
  cottage: Cottage,
  night: Night,
  date: DateNight,
  notebook: Notebook,
};

export function ChapterScenes({ theme }: { theme: ChapterTheme }) {
  const Scene = SCENES[theme];
  return (
    <div className={s.root} aria-hidden="true">
      <AnimatePresence initial={false}>
        <motion.div
          key={theme}
          className={`${s.scene} ${s[theme]}`}
          data-scene={theme}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
        >
          <Scene />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
