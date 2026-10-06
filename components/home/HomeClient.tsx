'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FlameSvg, RaceSvg, GearSvg, HelpSvg, StarSvg, MapSvg, PlaySvg, TrophySvg } from '@/components/ui/Icons';
import { DoodleButterfly, StageScene, ChapterArt, MixedArt } from '@/components/ui/Doodles';
import { TokenPill } from '@/components/rewards/TokenPill';
import { ALL_LEVEL_IDS, CHAPTERS, getLevelMeta } from '@/lib/levels/data';
import { GAME_DAY_UTC_OFFSET_MINUTES } from '@/lib/daily/logic';
import { usePlayer } from '@/lib/data/player';
import { ACHIEVEMENTS, unlockedIds } from '@/lib/rewards/achievements';

/*
 * Home is a game lobby (docs/game-feel.md §1), not a list of cards:
 *
 *   HUD      avatar + name + level · streak and star pills · settings
 *   Stage    the next level as the hero, over the chapter scene, with ONE
 *            giant Play button that goes straight into it
 *   Modes    Daily across the top, then Race / Free play / Album
 *
 * It is laid out to fill the screen above the tab bar with nothing to scroll
 * on a phone, and splits into stage | modes from 768px.
 */

const TILE =
  'press stagger-in relative flex flex-col justify-between gap-2 compact:gap-1 overflow-hidden border-2 border-line p-3 shadow-[4px_5px_0_0_var(--line)] min-h-[96px] compact:min-h-0 md:min-h-[120px] md:p-4';
/* Phones: the four modes sit in one row of compact tiles, so the lobby still
   fits above the tab bar with nothing to scroll; from 768px they are cards. */
const MODE =
  'press stagger-in relative flex flex-col items-center md:items-stretch justify-between gap-1 md:gap-2 overflow-hidden border-2 border-line px-1 py-2.5 md:p-4 shadow-[3px_4px_0_0_var(--line)] md:shadow-[4px_5px_0_0_var(--line)] min-h-[84px] compact:min-h-[76px] compact:py-2 md:min-h-[120px] text-center md:text-left';

function msUntilReset(now = Date.now()) {
  const day = 86_400_000;
  return day - ((now + GAME_DAY_UTC_OFFSET_MINUTES * 60_000) % day);
}

function formatReset(ms: number) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function HomeClient() {
  const { summary } = usePlayer();
  const [resetIn, setResetIn] = useState<string>('');

  // Everything on this screen is derived from the shared summary, so it is on
  // screen the instant the tab opens (cached), then refreshes behind.
  const stats = useMemo(() => {
    if (!summary) return null;
    const done = new Set(summary.levels.filter(p => (p.stars ?? 0) > 0).map(p => p.level_id));
    // The next level is the first one without stars, in path order.
    const nextLevelId = ALL_LEVEL_IDS.find(id => !done.has(id)) ?? ALL_LEVEL_IDS[ALL_LEVEL_IDS.length - 1];
    const chapter = CHAPTERS.find(c => c.levels.includes(nextLevelId));
    return {
      nextLevelId,
      stars: summary.levels.reduce((sum, p) => sum + (p.stars ?? 0), 0),
      wins: summary.isGuest ? null : summary.raceWins,
      streak: summary.streak,
      playedToday: summary.playedToday,
      name: summary.name,
      tokens: summary.tokens,
      chapterDone: chapter ? chapter.levels.filter(id => done.has(id)).length : 0,
      chapterTotal: chapter?.levels.length ?? 30,
      album: unlockedIds(summary.collection).size,
      friends: summary.friends,
      pending: summary.pendingRequests,
    };
  }, [summary]);

  // The daily tile counts down to the next game day, like an event timer.
  useEffect(() => {
    const update = () => setResetIn(formatReset(msUntilReset()));
    update();
    const id = window.setInterval(update, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const next = stats ? getLevelMeta(stats.nextLevelId) : undefined;
  const levelNumber = stats ? ALL_LEVEL_IDS.indexOf(stats.nextLevelId) + 1 : null;
  const avatar = summary?.avatar || undefined;
  const pct = stats ? Math.round((stats.chapterDone / stats.chapterTotal) * 100) : 0;

  return (
    <div
      className="flex flex-col w-full max-w-lg md:max-w-4xl mx-auto px-4 md:px-8 gap-3 compact:gap-2 md:gap-5 pb-3 compact:pb-2 md:pb-6 min-h-[calc(100dvh-var(--tabbar-h)-var(--safe-bottom))] rail:min-h-dvh"
      style={{ paddingTop: 'max(0.75rem, var(--safe-top))' }}
    >
      <h1 className="sr-only">NhakoSearch: cozy word search for two</h1>
      {/* ---------------------------------------------------------- HUD */}
      <header className="flex items-center gap-2">
        <Link
          href="/profile"
          className="press flex items-center gap-2 min-w-0 flex-1 h-12 pl-1 pr-3 rounded-full"
          aria-label={stats ? `Your profile, ${stats.name}` : 'Your profile'}
        >
          <span className="relative shrink-0 w-11 h-11 rounded-full border-2 border-line bg-accent-soft overflow-hidden flex items-center justify-center shadow-[2px_3px_0_0_var(--line)]">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- Google CDN avatar; next/image would proxy it through the paid optimiser.
              <img src={avatar} alt="" width={44} height={44} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <DoodleButterfly className="w-8" />
            )}
          </span>
          <span className="min-w-0 flex flex-col leading-tight">
            <span className="font-display font-bold text-ink truncate">{stats?.name ?? ' '}</span>
            <span className="text-xs font-extrabold text-ink-2 tabular">{levelNumber ? `Level ${levelNumber}` : ' '}</span>
          </span>
        </Link>
        {/* Phones: the streak already shows on the Daily card below, and the
            header needs the room for the name and the help button. */}
        <span className="hud-pill text-sm !hidden sm:!inline-flex" aria-label={`${stats?.streak ?? 0} day streak`}>
          <FlameSvg className="w-4 h-4 text-accent-ink" />
          {stats?.streak ?? 0}
        </span>
        <TokenPill tokens={stats?.tokens} />
        <Link
          href="/how-to-play"
          aria-label="How to play"
          className="press shrink-0 flex items-center justify-center w-11 h-11 rounded-full border-2 border-line bg-surface text-ink shadow-[2px_3px_0_0_var(--line)]"
        >
          <HelpSvg className="w-5 h-5" />
        </Link>
        <Link
          href="/settings"
          aria-label="Settings"
          className="press shrink-0 flex items-center justify-center w-11 h-11 rounded-full border-2 border-line bg-surface text-ink shadow-[2px_3px_0_0_var(--line)]"
        >
          <GearSvg className="w-5 h-5" />
        </Link>
      </header>

      <div className="flex-1 grid gap-3 compact:gap-2 md:gap-5 md:grid-cols-5 min-h-0">
        {/* --------------------------------------------------------- STAGE */}
        <section
          aria-labelledby="stage-title"
          className="stagger-in relative md:col-span-3 flex flex-col overflow-hidden border-2 border-line bg-lav-soft shadow-[4px_5px_0_0_var(--line)] min-h-[260px] md:min-h-[440px]"
          style={{ borderRadius: '26px 14px 28px 18px' }}
        >
          <StageScene className="absolute inset-x-0 bottom-0 w-full h-[62%]" />

          <div className="relative flex items-start justify-between p-4 compact:p-3 compact:pb-1">
            <span className="flex items-center gap-2 bg-surface border-2 border-line rounded-full pl-1 pr-3 py-0.5 -rotate-2 shadow-[2px_3px_0_0_var(--line)]">
              <ChapterArt chapter={next?.chapter ?? ''} className="w-8 h-8" />
              <span className="font-display font-bold text-ink text-sm">{next?.chapter ?? ' '}</span>
            </span>
            <Link
              href="/level-path"
              className="press flex items-center gap-1.5 h-10 px-3 rounded-full border-2 border-line bg-surface text-ink font-body font-extrabold text-sm shadow-[2px_3px_0_0_var(--line)]"
            >
              <MapSvg className="w-4 h-4" />
              Map
            </Link>
          </div>

          <div className="relative flex-1 flex flex-col items-center justify-center px-5 text-center">
            {/* On a short phone the butterfly perches beside "up next" instead
                of above it, which is what lets the mode tiles clear the tab bar. */}
            <span className="flex flex-col compact:flex-row items-center compact:gap-1">
              <DoodleButterfly className="idle-float w-16 md:w-20 compact:w-10 -mb-1 compact:mb-0" wing="var(--word-1)" wing2="var(--lav)" />
              <span className="font-accent text-2xl text-ink-2 -rotate-2 leading-none">up next</span>
            </span>
            <h2 id="stage-title" className="font-display font-bold text-ink leading-none text-[clamp(3rem,15vw,4.75rem)] compact:text-5xl tabular">
              {levelNumber ? `Level ${levelNumber}` : ' '}
            </h2>
            <p className="mt-1 text-sm font-extrabold uppercase tracking-widest text-ink-2">
              {next ? `${next.chapter} ${next.numberInChapter} · ${next.difficulty}` : ' '}
            </p>
          </div>

          <div className="relative p-4 pt-2 compact:p-3 compact:pt-1 flex flex-col gap-3 compact:gap-2.5">
            <div className="flex items-center gap-2 bg-surface/90 border-2 border-line rounded-full px-3 py-1.5 compact:py-1">
              <div
                className="nera-track flex-1 !border-0 !p-0 h-2.5"
                role="progressbar"
                aria-label="Chapter progress"
                aria-valuemin={0}
                aria-valuemax={stats?.chapterTotal ?? 30}
                aria-valuenow={stats?.chapterDone ?? 0}
              >
                <div className="nera-fill" style={{ width: `${Math.max(pct, 4)}%` }} />
              </div>
              <span className="text-xs font-extrabold text-ink tabular">
                {stats ? `${stats.chapterDone}/${stats.chapterTotal}` : ' '}
              </span>
              <span className="flex items-center gap-1 pl-2 border-l-2 border-ink/15 text-xs font-extrabold text-ink tabular" aria-label={`${stats?.stars ?? 0} stars`}>
                <StarSvg className="w-3.5 h-3.5 text-gold" filled />
                {stats?.stars ?? 0}
              </span>
            </div>
            <Link
              href={stats ? `/level-path/${stats.nextLevelId}` : '/level-path'}
              className="press play-glow flex items-center justify-center gap-3 min-h-[64px] compact:min-h-[56px] border-[3px] border-line bg-accent text-on-accent font-display font-bold text-2xl"
              style={{ borderRadius: '22px 14px 24px 12px' }}
            >
              <PlaySvg className="w-7 h-7" />
              Play
            </Link>
          </div>
        </section>

        {/* --------------------------------------------------------- MODES */}
        <nav aria-label="Game modes" className="md:col-span-2 grid grid-cols-4 md:grid-cols-2 gap-2 md:gap-4 md:auto-rows-fr">
          <Link
            href="/daily"
            className={`${TILE} bg-accent-soft col-span-4 md:col-span-2`}
            style={{ borderRadius: '18px 24px 14px 22px', ['--i' as string]: 1 }}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="flex flex-col">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-ink-2">Daily puzzle</span>
                <span className="font-display font-bold text-ink text-xl leading-tight">
                  {stats?.playedToday ? 'Done for today' : "Today's puzzle"}
                </span>
              </span>
              <span className="hud-pill !h-8 text-sm !shadow-none">
                <FlameSvg className="w-4 h-4 text-accent-ink" />
                {stats?.streak ?? 0}
              </span>
            </span>
            <span className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-ink-2 tabular">{resetIn ? `New puzzle in ${resetIn}` : ' '}</span>
              <span className="flex items-center gap-1 h-9 compact:h-8 px-3 rounded-full border-2 border-line bg-accent text-on-accent font-display font-bold text-sm">
                {stats?.playedToday ? 'Streak' : 'Play'}
              </span>
            </span>
          </Link>

          <Link href="/play/race/lobby" className={`${MODE} bg-surface`} style={{ borderRadius: '14px 22px 18px 12px', ['--i' as string]: 2 }}>
            <RaceSvg className="w-8 h-8 md:w-14 md:h-14 text-accent-ink" />
            <span className="flex flex-col items-center md:items-start">
              <span className="font-display font-bold text-ink text-[13px] md:text-lg leading-tight tracking-tight md:tracking-normal">Multiplayer</span>
              <span className="hidden md:block text-xs font-extrabold text-ink-2 tabular">
                {stats?.wins != null ? `${stats.wins} wins` : 'with a friend'}
              </span>
            </span>
          </Link>

          <Link href="/play/standard" className={`${MODE} bg-surface`} style={{ borderRadius: '22px 12px 16px 20px', ['--i' as string]: 3 }}>
            <MixedArt className="w-9 h-9 md:w-16 md:h-16" />
            <span className="flex flex-col items-center md:items-start">
              <span className="font-display font-bold text-ink text-sm md:text-lg leading-tight">Free play</span>
              <span className="hidden md:block text-xs font-extrabold text-ink-2">pick a theme</span>
            </span>
          </Link>

          <Link href="/album" className={`${MODE} bg-lav-soft`} style={{ borderRadius: '12px 20px 14px 24px', ['--i' as string]: 4 }}>
            <DoodleButterfly className="w-10 md:w-16" wing="var(--word-2)" wing2="var(--word-5)" />
            <span className="flex flex-col items-center md:items-start">
              <span className="font-display font-bold text-ink text-sm md:text-lg leading-tight">Album</span>
              <span className="text-[11px] md:text-xs font-extrabold text-ink-2 tabular">{stats ? `${stats.album} of ${ACHIEVEMENTS.length}` : ' '}</span>
            </span>
          </Link>

          <Link href="/friends" className={`${MODE} bg-surface`} style={{ borderRadius: '20px 14px 22px 12px', ['--i' as string]: 5 }}>
            <span className="relative md:self-start">
              <TrophySvg className="w-8 h-8 md:w-14 md:h-14 text-gold" />
              {(stats?.pending ?? 0) > 0 && (
                <span className="absolute -top-1 -right-2 min-w-5 h-5 px-1 flex items-center justify-center rounded-full border-2 border-line bg-accent text-on-accent text-[11px] font-extrabold tabular">
                  {stats!.pending}
                </span>
              )}
            </span>
            <span className="flex flex-col items-center md:items-start">
              <span className="font-display font-bold text-ink text-sm md:text-lg leading-tight">Friends</span>
              <span className="hidden md:block text-xs font-extrabold text-ink-2 tabular">
                {stats?.pending ? `${stats.pending} new request${stats.pending > 1 ? 's' : ''}` : stats?.friends ? `${stats.friends} on the board` : 'leaderboard'}
              </span>
            </span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
