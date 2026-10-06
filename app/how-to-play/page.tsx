import Link from 'next/link';
import type { ReactNode } from 'react';
import { ClockSvg, FlameSvg, MapSvg, RaceSvg, ShareSvg, StarSvg, TokenSvg, WandSvg } from '@/components/ui/Icons';
import { DoodleButterfly } from '@/components/ui/Doodles';
import { HINT_COOLDOWN_MS, HINT_COST, STAR_TIMES, freeHintPenaltySeconds } from '@/lib/rewards/economy';
import { ROOM_CODE_LENGTH } from '@/lib/multiplayer/identity';
import { pageMetadata } from '@/lib/site';
import s from './howto.module.css';

/*
 * How to Play. A Server Component on purpose: it renders as plain HTML, so it
 * is readable before any script loads and doubles as the page search engines
 * index to learn what the game is. The only motion is CSS (the demo boards
 * tracing their words), and it stops under reduced motion.
 *
 * Every number on this page is imported from the code that enforces it, so
 * the rules here cannot drift from the game.
 */

export const metadata = pageMetadata({
  title: 'How to play',
  description:
    'How to play NhakoSearch, the free cozy word search: drag to find words in every direction, earn stars and tokens, race or team up with a friend online, and install it on any device.',
  path: '/how-to-play',
});

const SECTIONS = [
  ['basics', 'Basics'],
  ['directions', 'Directions'],
  ['hints', 'Stars & hints'],
  ['modes', 'Ways to play'],
  ['together', 'Multiplayer'],
  ['install', 'Install'],
] as const;

/** A 5×5 demo board with one word traced on it, drawing itself on a loop. */
function DemoBoard({
  letters,
  from,
  to,
  color,
  label,
}: {
  letters: string;
  from: [number, number];
  to: [number, number];
  color: string;
  label: string;
}) {
  const c = (n: number) => n * 20 + 10;
  return (
    <figure className="flex flex-col items-center gap-2">
      <div className={s.board} role="img" aria-label={label}>
        <svg viewBox="0 0 100 100" className={s.trace} aria-hidden="true">
          <line x1={c(from[0])} y1={c(from[1])} x2={c(to[0])} y2={c(to[1])} className={s.outline} pathLength={1} />
          <line x1={c(from[0])} y1={c(from[1])} x2={c(to[0])} y2={c(to[1])} className={s.capsule} style={{ stroke: color }} pathLength={1} />
        </svg>
        {letters.split('').map((l, i) => (
          <span key={i} className={s.cell} aria-hidden="true">
            {l}
          </span>
        ))}
      </div>
      <figcaption className="text-sm font-extrabold text-ink-2">{label}</figcaption>
    </figure>
  );
}

const ARROWS: [string, number, number][] = [
  ['↖', -1, -1], ['↑', 0, -1], ['↗', 1, -1],
  ['←', -1, 0], ['', 0, 0], ['→', 1, 0],
  ['↙', -1, 1], ['↓', 0, 1], ['↘', 1, 1],
];

/** Which way words can run at a difficulty, as a 3×3 compass. */
function Compass({ allowed }: { allowed: [number, number][] }) {
  const on = (dx: number, dy: number) => allowed.some(([x, y]) => x === dx && y === dy);
  return (
    <div className={s.compass} aria-hidden="true">
      {ARROWS.map(([glyph, dx, dy], i) =>
        glyph ? (
          <span key={i} className={on(dx, dy) ? s.dirOn : s.dirOff}>
            {glyph}
          </span>
        ) : (
          <span key={i} className={s.dirCentre}>
            <DoodleButterfly className="w-6" />
          </span>
        )
      )}
    </div>
  );
}

const DIFFICULTIES: {
  name: string;
  grid: string;
  words: number;
  dirs: [number, number][];
  says: string;
}[] = [
  { name: 'Easy', grid: '8 × 8', words: 6, dirs: [[1, 0], [0, 1]], says: 'Left to right, and top to bottom.' },
  { name: 'Medium', grid: '10 × 10', words: 8, dirs: [[1, 0], [0, 1], [1, 1], [-1, 1]], says: 'Adds the two downward diagonals.' },
  {
    name: 'Hard',
    grid: '13 × 13',
    words: 10,
    dirs: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [-1, 1], [1, -1]],
    says: 'All eight ways, backwards and upwards included.',
  },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 flex flex-col gap-4">
      <h2 id={`${id}-title`} className="font-display font-bold text-ink text-2xl md:text-3xl leading-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Panel({ children, className = '', radius = '20px 14px 22px 16px' }: { children: ReactNode; className?: string; radius?: string }) {
  return (
    <div className={`bg-surface border-2 border-line shadow-[4px_5px_0_0_var(--line)] p-4 md:p-5 ${className}`} style={{ borderRadius: radius }}>
      {children}
    </div>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 items-start">
          <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border-2 border-line bg-accent text-on-accent font-display font-bold tabular">
            {i + 1}
          </span>
          <span className="pt-1 font-body font-bold text-ink leading-snug">{item}</span>
        </li>
      ))}
    </ol>
  );
}

export default function HowToPlayPage() {
  const cooldown = HINT_COOLDOWN_MS / 1000;
  return (
    <div
      className="flex flex-col w-full max-w-2xl mx-auto px-4 md:px-8 gap-10 pb-12"
      style={{ paddingTop: 'max(1.25rem, var(--safe-top))' }}
    >
      {/* ------------------------------------------------------------ hero */}
      <header className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
        <div className="flex flex-col gap-3">
          <h1 className="font-display font-bold text-ink text-4xl md:text-5xl leading-none">How to play</h1>
          <p className="font-body font-bold text-ink-2 text-lg leading-snug max-w-[34ch]">
            Find every hidden word by drawing a line across it. That&apos;s the whole game, and it only gets cozier.
          </p>
          <div className="flex flex-wrap gap-3 mt-1">
            <Link href="/level-path" className={`sticker ${s.cta} bg-accent text-on-accent`}>
              Play
            </Link>
            <Link href="/daily" className={`sticker ${s.cta} bg-surface text-ink`}>
              Today&apos;s puzzle
            </Link>
          </div>
        </div>
        <DemoBoard letters="BLOOMXTRQAZEHNPKUYVCJGSDW" from={[0, 0]} to={[4, 0]} color="var(--word-3)" label="BLOOM, traced across the top row" />
      </header>

      {/* Jump list: the page is long on a phone. */}
      <nav aria-label="On this page" className="flex flex-wrap gap-2 -mt-4">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="press px-3 h-9 flex items-center rounded-full border-2 border-line bg-tile text-ink text-sm font-extrabold">
            {label}
          </a>
        ))}
      </nav>

      {/* ---------------------------------------------------------- basics */}
      <Section id="basics" title="Find a word">
        <Panel>
          <Steps
            items={[
              'Press on the first letter of a word from the list under the board.',
              'Keep your finger (or mouse) down and drag in a straight line to its last letter.',
              'Let go. If it is a word on the list, it gets a coloured capsule and flies up to the garland.',
              'Find them all to clear the board. A run of quick finds builds a combo.',
            ]}
          />
        </Panel>
        <div className="grid grid-cols-2 gap-4">
          <DemoBoard letters="CATSQWBEEPLOMXTREFNUKDOGS" from={[0, 0]} to={[2, 0]} color="var(--word-1)" label="CAT, across" />
          <DemoBoard letters="SXMROUQAWNNLCFBTZDEJYPGHK" from={[0, 0]} to={[0, 2]} color="var(--word-5)" label="SUN, down" />
        </div>
        <p className="font-body font-bold text-ink-2">
          On a keyboard: Tab to the board, arrow keys to move, Enter on the first letter, then Enter again on the last. Escape cancels.
        </p>
      </Section>

      {/* ------------------------------------------------------ directions */}
      <Section id="directions" title="Which way words run">
        <p className="font-body font-bold text-ink-2 -mt-1">
          Words always run in a straight line. Harder boards are bigger and hide words in more directions.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {DIFFICULTIES.map(d => (
            <Panel key={d.name} className="flex flex-col items-center gap-3 text-center">
              <span className="font-display font-bold text-ink text-xl">{d.name}</span>
              <Compass allowed={d.dirs} />
              <span className="text-sm font-extrabold text-ink tabular">
                {d.grid} board, {d.words} words
              </span>
              <span className="text-sm font-bold text-ink-2 leading-snug">{d.says}</span>
            </Panel>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <DemoBoard letters="KQWPMZIRXUAOTVLNHBEYFDGCS" from={[0, 0]} to={[3, 3]} color="var(--word-2)" label="KITE, on a diagonal" />
          <DemoBoard letters="QWERTYMOORPLKJHGFDSAZXCVB" from={[4, 1]} to={[1, 1]} color="var(--word-6)" label="ROOM, backwards (hard)" />
        </div>
      </Section>

      {/* ----------------------------------------------------------- hints */}
      <Section id="hints" title="Stars, hints and tokens">
        <Panel className="flex flex-col gap-4">
          <div className="flex gap-3 items-start">
            <StarSvg className="shrink-0 w-7 h-7 text-gold" filled />
            <div className="flex flex-col gap-2">
              <p className="font-body font-bold text-ink">Faster finishes earn more stars. Three stars if you beat:</p>
              <ul className="flex flex-wrap gap-2">
                {(Object.keys(STAR_TIMES) as (keyof typeof STAR_TIMES)[]).map(k => (
                  <li key={k} className="hud-pill text-sm !h-8 capitalize">
                    <ClockSvg className="w-4 h-4 text-accent-ink" />
                    {k} {STAR_TIMES[k][0]}s
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <WandSvg className="shrink-0 w-7 h-7 text-accent-ink" />
            <p className="font-body font-bold text-ink">
              Stuck? A hint lights up a letter on the board: the first letter of a word you haven&apos;t found, then the next letter,
              and so on. A hint costs {HINT_COST} butterfly tokens. Without enough tokens a hint is free, but adds{' '}
              {freeHintPenaltySeconds(0)}s to your time ({freeHintPenaltySeconds(1)}s for the next one). Hints recharge for {cooldown}{' '}
              seconds after each use.
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <TokenSvg className="shrink-0 w-7 h-7" />
            <p className="font-body font-bold text-ink">
              You earn tokens for every board you clear: more for harder boards, more stars, no hints, daily streaks, race wins and new
              butterflies in your album.
            </p>
          </div>
        </Panel>
      </Section>

      {/* ----------------------------------------------------------- modes */}
      <Section id="modes" title="Ways to play">
        <ul className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: <FlameSvg className="w-7 h-7 text-accent-ink" />, title: 'Daily puzzle', body: 'One board a day, the same for everyone. Play every day to grow your streak.', href: '/daily' },
            { icon: <MapSvg className="w-7 h-7 text-accent-ink" />, title: 'Level path', body: '360 levels across twelve themed chapters. A star on a level opens the next one.', href: '/level-path' },
            { icon: <WandSvg className="w-7 h-7 text-accent-ink" />, title: 'Free play', body: 'Pick any of twelve themes and a difficulty, and play as many boards as you like.', href: '/play/standard' },
            { icon: <DoodleButterfly className="w-8" />, title: 'Butterfly album', body: 'Every achievement is a butterfly species to collect. There are 37 to find.', href: '/album' },
          ].map(m => (
            <li key={m.title}>
              <Link href={m.href} className="press h-full flex gap-3 p-4 bg-surface border-2 border-line shadow-[4px_5px_0_0_var(--line)] rounded-[20px]">
                <span className="shrink-0 w-12 h-12 flex items-center justify-center rounded-full border-2 border-line bg-accent-soft">{m.icon}</span>
                <span className="flex flex-col gap-1">
                  <span className="font-display font-bold text-ink text-lg">{m.title}</span>
                  <span className="text-sm font-bold text-ink-2 leading-snug">{m.body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* -------------------------------------------------------- together */}
      <Section id="together" title="Play with a friend">
        <Panel className="flex flex-col gap-4" radius="14px 22px 16px 20px">
          <Steps
            items={[
              <>
                Open <strong>Multiplayer</strong>, choose <strong>Create room</strong>, then <strong>Start a new room</strong>.
              </>,
              <>Send your friend the {ROOM_CODE_LENGTH}-character room code, or tap Share to send them the link.</>,
              <>
                They choose <strong>Join room</strong> and type the code, on a phone, tablet or computer. Any mix works.
              </>,
              <>
                You pick <strong>Race</strong> or <strong>Together</strong> and a difficulty. Your friend taps Ready Up, and you tap Start.
              </>,
            ]}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex gap-3 items-start p-3 rounded-2xl border-2 border-ink/15 bg-background">
              <RaceSvg className="shrink-0 w-7 h-7 text-accent-ink" />
              <p className="text-sm font-bold text-ink leading-snug">
                <strong>Race:</strong> you both get the same board after a countdown. You can see each other&apos;s progress live, and
                whoever finds every word first wins.
              </p>
            </div>
            <div className="flex gap-3 items-start p-3 rounded-2xl border-2 border-ink/15 bg-background">
              <DoodleButterfly className="shrink-0 w-8" />
              <p className="text-sm font-bold text-ink leading-snug">
                <strong>Together:</strong> one shared board. Every word either of you finds counts for both, and you can chat while
                you search.
              </p>
            </div>
          </div>
          <p className="text-sm font-bold text-ink-2">
            Signed in with Google? Add friends with their friend code to get live requests and a friends leaderboard.
          </p>
        </Panel>
        <Link href="/play/race/lobby" className={`sticker ${s.cta} self-start bg-accent text-on-accent`}>
          Play with a friend
        </Link>
      </Section>

      {/* --------------------------------------------------------- install */}
      <Section id="install" title="Install it like an app">
        <p className="font-body font-bold text-ink-2 -mt-1">
          NhakoSearch is free and runs in your browser, so there is nothing to download from a store. Add it to your home screen and it
          opens full screen, like any other app.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          <Panel className="flex flex-col gap-2">
            <span className="font-display font-bold text-ink text-lg">iPhone & iPad</span>
            <p className="text-sm font-bold text-ink-2 leading-snug">
              Open it in Safari, tap <ShareSvg className="inline w-4 h-4 -mt-1" /> Share, then <strong className="text-ink">Add to Home Screen</strong>.
            </p>
          </Panel>
          <Panel className="flex flex-col gap-2" radius="14px 22px 16px 20px">
            <span className="font-display font-bold text-ink text-lg">Android</span>
            <p className="text-sm font-bold text-ink-2 leading-snug">
              Open it in Chrome, tap the ⋮ menu, then <strong className="text-ink">Install app</strong> (or Add to Home screen).
            </p>
          </Panel>
          <Panel className="flex flex-col gap-2" radius="22px 16px 14px 20px">
            <span className="font-display font-bold text-ink text-lg">Computer</span>
            <p className="text-sm font-bold text-ink-2 leading-snug">
              In Chrome or Edge, click the install icon at the right end of the address bar. Mac Safari: File, then{' '}
              <strong className="text-ink">Add to Dock</strong>.
            </p>
          </Panel>
        </div>
        <p className="text-sm font-bold text-ink-2">
          Play as a guest straight away. Sign in with Google to keep your progress across devices.
        </p>
      </Section>

      <footer className="flex flex-col items-center gap-3 text-center pt-2">
        <DoodleButterfly className="w-14 idle-float" />
        <p className="font-display font-bold text-ink text-2xl">Ready?</p>
        <Link href="/level-path" className={`sticker ${s.cta} bg-accent text-on-accent`}>
          Play
        </Link>
      </footer>
    </div>
  );
}
