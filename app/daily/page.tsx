'use client';
import { useEffect, useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FlameSvg, StarSvg } from '@/components/ui/Icons';
import {
  checkDailyStreak,
  gameDateString,
  gameDayLabel,
  getDailyStars,
  getRecentDailyHistory,
} from '@/lib/daily/logic';

interface DailyView {
  streak: number;
  playedToday: boolean;
  history: boolean[];
  stars: number | null;
  label: string;
  initials: string[];
}

/** Weekday initials for the last seven game days, oldest first. */
function recentDayInitials(): string[] {
  const today = Date.parse(`${gameDateString()}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(today - (6 - i) * 86_400_000).toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' })
  );
}

export default function DailyChallengePage() {
  const [view, setView] = useState<DailyView | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([checkDailyStreak(), getRecentDailyHistory(7)]).then(([data, history]) => {
      // Dates are computed here, never during render: this page is prerendered
      // at build time, so a render-time date would be the build's date.
      if (!cancelled) {
        setView({ ...data, history, stars: getDailyStars(), label: gameDayLabel(), initials: recentDayInitials() });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The game day's own date, not the device's: outside UTC+8 the header used
  // to show a different day from the puzzle underneath it.
  const label = view?.label ?? '\u00a0';
  const initials = view?.initials ?? Array.from({ length: 7 }, () => '\u00a0');

  return (
    <div
      className="flex flex-col w-full max-w-lg mx-auto px-5 pb-6"
      style={{ paddingTop: 'max(1.25rem, var(--safe-top))' }}
    >
      <h1 className="text-4xl font-display text-ink">Daily challenge</h1>
      <p className="font-accent text-ink-2 text-2xl mb-6 -rotate-1">{label}</p>

      <Card className={`flex flex-col items-center gap-5 text-center py-8 ${view?.playedToday ? '' : 'bg-accent-soft'}`}>
        {view?.playedToday ? (
          <>
            <h2 className="text-2xl font-display text-ink">Puzzle completed</h2>
            {view.stars !== null && (
              <div className="flex gap-2" role="img" aria-label={`${view.stars} of 3 stars`}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <StarSvg
                    key={i}
                    className={`w-10 h-10 ${i < view.stars! ? 'text-gold' : 'text-ink/20'}`}
                    filled={i < view.stars!}
                  />
                ))}
              </div>
            )}
          </>
        ) : null}

        <div className="flex items-center gap-2" aria-label={`${view?.streak ?? 0} day streak`}>
          <FlameSvg className="w-9 h-9 text-accent-ink" />
          <span className="font-display font-bold text-ink text-4xl tabular">{view?.streak ?? ' '}</span>
          <span className="font-body font-extrabold text-ink-2">day streak</span>
        </div>

        {/* Last seven days. Each dot carries its day and state in text, so the
            strip does not rely on colour alone. */}
        <ol className="flex gap-[6px] sm:gap-2" aria-label="Last 7 days">
          {initials.map((d, i) => {
            const played = view?.history[i] ?? false;
            return (
              <li key={i} className="flex flex-col items-center gap-1">
                <span
                  className={`w-[28px] h-[28px] rounded-full border-2 flex items-center justify-center ${
                    played ? 'bg-accent border-ink' : 'bg-surface border-ink/25'
                  }`}
                >
                  {played && <span className="w-2 h-2 rounded-full bg-on-accent" />}
                </span>
                <span className="text-[11px] font-extrabold text-ink-2" aria-hidden="true">
                  {d}
                </span>
                <span className="sr-only">{played ? 'played' : 'not played'}</span>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="flex flex-col gap-3 mt-8">
        {view?.playedToday ? (
          <>
            <p className="text-center text-ink-2 font-body font-bold">A new puzzle arrives tomorrow.</p>
            <ButtonLink href="/daily/play" variant="secondary" fullWidth>
              Play it again
            </ButtonLink>
          </>
        ) : (
          <ButtonLink href="/daily/play" fullWidth className="py-4 text-xl">
            Play today&rsquo;s puzzle
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
