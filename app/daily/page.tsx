'use client';
import { useEffect, useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { FlameSvg, StarSvg, PlaySvg, ClockSvg } from '@/components/ui/Icons';
import { StageScene, THEME_ART } from '@/components/ui/Doodles';
import { Species } from '@/components/butterfly/Species';
import { TokenSvg } from '@/components/ui/Icons';
import { usePlayer } from '@/lib/data/player';
import { seededSpecies } from '@/lib/rewards/species';
import { THEMES } from '@/lib/words/themes';
import {
  GAME_DAY_UTC_OFFSET_MINUTES,
  dailyThemeIndex,
  gameDateString,
  gameDayLabel,
  getDailyStars,
} from '@/lib/daily/logic';

interface DayView {
  date: string;
  stars: number | null;
  label: string;
  initials: string[];
  last7: string[];
  day: string;
  month: string;
}

function resetIn(now = Date.now()) {
  const ms = 86_400_000 - ((now + GAME_DAY_UTC_OFFSET_MINUTES * 60_000) % 86_400_000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Weekday initials for the last seven game days, oldest first. */
function recentDayInitials(): string[] {
  const today = Date.parse(`${gameDateString()}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(today - (6 - i) * 86_400_000).toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' })
  );
}

export default function DailyChallengePage() {
  const { summary } = usePlayer();
  // Dates are computed after mount, never during render: this page is
  // prerendered at build time, so a render-time date would be the build's.
  const [dayView, setDayView] = useState<DayView | null>(null);
  useEffect(() => {
    const today = gameDateString();
    const date = new Date(`${today}T00:00:00Z`);
    const t = Date.parse(`${today}T00:00:00Z`);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDayView({
      date: today,
      stars: getDailyStars(),
      label: gameDayLabel(),
      initials: recentDayInitials(),
      last7: Array.from({ length: 7 }, (_, i) => new Date(t - (6 - i) * 86_400_000).toISOString().slice(0, 10)),
      day: String(date.getUTCDate()),
      month: date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
    });
  }, []);

  const view = summary && dayView
    ? (() => {
        const played = new Set(summary.dailyDates);
        return {
          ...dayView,
          streak: summary.streak,
          playedToday: summary.playedToday,
          history: dayView.last7.map(d => played.has(d)),
        };
      })()
    : null;
  const theme = dayView ? THEMES[dailyThemeIndex(dayView.date, THEMES.length)] : null;
  const ThemeArt = theme ? THEME_ART[theme.id] : null;
  const keepsake = dayView ? seededSpecies(`daily-${dayView.date}`) : null;

  // The game day's own date, not the device's: outside UTC+8 the header used
  // to show a different day from the puzzle underneath it.
  const label = dayView?.label ?? '\u00a0';
  const initials = dayView?.initials ?? Array.from({ length: 7 }, () => '\u00a0');

  // Event countdown, like a live-ops daily in any mobile game.
  const [countdown, setCountdown] = useState('');
  useEffect(() => {
    const tick = () => setCountdown(resetIn());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="flex flex-col w-full max-w-lg md:max-w-2xl mx-auto px-4 gap-4 pb-4 min-h-[calc(100dvh-var(--tabbar-h)-var(--safe-bottom))] rail:min-h-dvh"
      style={{ paddingTop: 'max(1rem, var(--safe-top))' }}
    >
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-display text-ink leading-none">Daily puzzle</h1>
          <p className="font-accent text-ink-2 text-2xl -rotate-1">{label}</p>
        </div>
        <span className="hud-pill text-sm mb-2" aria-label={`New puzzle in ${countdown}`}>
          <ClockSvg className="w-4 h-4 text-accent-ink" />
          {countdown || ' '}
        </span>
      </header>

      {/* Hero: a tear-off calendar page next to the streak flame. */}
      <section
        className="stagger-in relative flex flex-1 min-h-[168px] max-h-[300px] items-center justify-center gap-6 p-4 overflow-hidden border-2 border-line bg-accent-soft shadow-[4px_5px_0_0_var(--line)]"
        style={{ borderRadius: '24px 14px 26px 16px' }}
      >
        <StageScene className="absolute inset-x-0 bottom-0 w-full h-[55%] opacity-60" />
        <div
          className="relative shrink-0 w-[112px] overflow-hidden border-2 border-line bg-tile shadow-[3px_4px_0_0_var(--line)] -rotate-3"
          style={{ borderRadius: '14px 10px 16px 8px' }}
          aria-hidden="true"
        >
          <div className="h-7 flex items-center justify-center bg-accent border-b-2 border-line font-display font-bold text-sm text-on-accent tracking-widest">
            {view?.month ?? ' '}
          </div>
          <div className="h-[76px] flex items-center justify-center font-display font-bold text-5xl text-ink tabular">
            {view?.day ?? ' '}
          </div>
        </div>
        <div className="relative flex flex-col gap-1 min-w-0">
          <span className="flex items-center gap-1.5" aria-label={`${view?.streak ?? 0} day streak`}>
            <FlameSvg className="w-10 h-10 text-accent-ink" />
            <span className="font-display font-bold text-ink text-5xl leading-none tabular">{view?.streak ?? 0}</span>
          </span>
          <span className="font-body font-extrabold text-ink-2">day streak</span>
          {view?.playedToday && view.stars !== null && (
            <span className="flex gap-1 mt-1" role="img" aria-label={`Today: ${view.stars} of 3 stars`}>
              {Array.from({ length: 3 }).map((_, i) => (
                <StarSvg key={i} className={`w-6 h-6 ${i < view.stars! ? 'text-gold' : 'text-ink/20'}`} filled={i < view.stars!} />
              ))}
            </span>
          )}
        </div>
      </section>

      {/* This week. Each token carries its day and state in text, so the strip
          does not rely on colour alone. */}
      <section className="stagger-in p-3 bg-surface border-2 border-line shadow-[3px_4px_0_0_var(--line)]" style={{ borderRadius: '16px 22px 14px 20px', ['--i' as string]: 1 }}>
        <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-ink-2 mb-2">Last 7 days</h2>
        <ol className="grid grid-cols-7 gap-1" aria-label="Last 7 days">
          {initials.map((d, i) => {
            const played = view?.history[i] ?? false;
            const today = i === 6;
            return (
              <li key={i} className="flex flex-col items-center gap-1">
                <span
                  className={`w-full max-w-[40px] aspect-square rounded-full border-2 flex items-center justify-center ${
                    played ? 'bg-accent border-line text-on-accent' : today ? 'bg-tile border-line border-dashed text-ink-2' : 'bg-tile border-ink/25 text-ink/25'
                  }`}
                >
                  <FlameSvg className="w-5 h-5" />
                </span>
                <span className={`text-[11px] ${today ? 'font-black text-ink underline decoration-2 decoration-accent' : 'font-extrabold text-ink-2'}`} aria-hidden="true">
                  {d}
                </span>
                <span className="sr-only">{played ? 'played' : 'not played'}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Today's theme and reward: a one-of-a-kind butterfly for the date. */}
      <section
        className="stagger-in grid grid-cols-2 gap-3"
        style={{ ['--i' as string]: 2 }}
      >
        <div className="flex items-center gap-2.5 p-3 bg-surface border-2 border-line shadow-[3px_4px_0_0_var(--line)]" style={{ borderRadius: '18px 12px 20px 14px' }}>
          <span className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full border-2 border-line" style={{ background: theme ? `color-mix(in srgb, ${theme.hue} calc(40% * var(--tint-boost)), var(--surface))` : undefined }}>
            {ThemeArt && <ThemeArt className="w-8 h-8" />}
          </span>
          <span className="flex flex-col min-w-0">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-ink-2">Theme</span>
            <span className="font-display font-bold text-ink leading-tight truncate">{theme?.name ?? '\u00a0'}</span>
          </span>
        </div>
        <div className="flex items-center gap-2.5 p-3 bg-lav-soft border-2 border-line shadow-[3px_4px_0_0_var(--line)]" style={{ borderRadius: '12px 20px 14px 18px' }}>
          <span className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full border-2 border-line bg-tile">
            {keepsake && <Species spec={keepsake} className="w-9 idle-float" />}
          </span>
          <span className="flex flex-col min-w-0">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-ink-2">Reward</span>
            <span className="flex items-center gap-1 font-display font-bold text-ink leading-tight">
              <TokenSvg className="w-4 h-4" />
              10+ &amp; a stamp
            </span>
          </span>
        </div>
      </section>

      <div className="mt-auto flex flex-col gap-3 pt-2">
        {view?.playedToday ? (
          <>
            <p className="text-center text-ink-2 font-body font-bold">Done for today. A new puzzle arrives in {countdown}.</p>
            <ButtonLink href="/daily/play" variant="secondary" fullWidth>
              Play again
            </ButtonLink>
          </>
        ) : (
          <ButtonLink href="/daily/play" fullWidth className="py-4 text-xl play-glow">
            <PlaySvg className="w-6 h-6" />
            Play
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
