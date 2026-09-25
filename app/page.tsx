'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { ButterflySvg, FlameSvg, MapSvg, RaceSvg, GearSvg, ChevronRightSvg, StarSvg } from '@/components/ui/Icons';
import { supabase } from '@/lib/multiplayer/supabase';
import { ALL_LEVEL_IDS, getLevelMeta } from '@/lib/levels/data';
import { checkDailyStreak } from '@/lib/daily/logic';
import { loadLevelProgress } from '@/lib/levels/progress';
import { getUserProfile } from '@/lib/auth/profile';

interface HomeStats {
  levels: number;
  nextLevelId: string;
  wins: number;
  streak: number;
  playedToday: boolean;
  name: string;
}

const CARD =
  'press block bg-surface border-2 border-ink p-5 rounded-tl-[16px] rounded-tr-[24px] rounded-br-[18px] rounded-bl-[22px] shadow-[4px_5px_0_0_var(--ink)]';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<HomeStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user ?? null;

      const [progress, daily, profile] = await Promise.all([
        loadLevelProgress(),
        // Resolved against today: the raw stored count kept showing a streak
        // that had already lapsed (the daily page said 0, home said 5).
        checkDailyStreak(),
        getUserProfile(),
      ]);

      let wins = 0;
      if (currentUser) {
        const { count } = await supabase
          .from('race_history')
          .select('*', { count: 'exact', head: true })
          .eq('winner', currentUser.id);
        wins = count ?? 0;
      }

      // The next level is the first one without stars, in path order — not
      // "number completed", which pointed at the wrong level after a skip.
      const done = new Set(progress.filter(p => (p.stars ?? 0) > 0).map(p => p.level_id));
      const nextLevelId = ALL_LEVEL_IDS.find(id => !done.has(id)) ?? ALL_LEVEL_IDS[ALL_LEVEL_IDS.length - 1];

      if (cancelled) return;
      setUser(currentUser);
      setStats({
        levels: done.size,
        nextLevelId,
        wins,
        streak: daily.streak,
        playedToday: daily.playedToday,
        name: profile.displayName,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const next = stats ? getLevelMeta(stats.nextLevelId) : undefined;

  return (
    <div className="flex flex-col w-full max-w-lg md:max-w-3xl mx-auto px-5 md:px-8 pb-6" style={{ paddingTop: 'max(1.25rem, var(--safe-top))' }}>
      {/* Header */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          {/* Capped by viewport width: at large text sizes the one-word title
              ran under the settings button. */}
          <h1 className="font-display text-ink leading-tight text-[min(2.25rem,9.5vw)]">NhakoSearch</h1>
          <p className="font-accent text-2xl text-ink-2 -rotate-1 truncate h-8">
            {stats ? `Hi, ${stats.name}` : ' '}
          </p>
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="press shrink-0 flex items-center justify-center w-12 h-12 rounded-full border-2 border-ink bg-surface text-ink"
        >
          <GearSvg className="w-6 h-6" />
        </Link>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Daily challenge */}
        <Link href="/daily" className={`${CARD} bg-accent-soft md:col-span-2`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold text-ink-2 uppercase tracking-widest mb-1">Daily challenge</p>
              <h2 className="text-2xl font-display text-ink">
                {stats?.playedToday ? 'Done for today' : "Today's puzzle"}
              </h2>
            </div>
            <span
              className="flex items-center gap-1 bg-surface px-2.5 py-1 border-2 border-ink rounded-xl font-bold text-ink tabular"
              aria-label={`${stats?.streak ?? 0} day streak`}
            >
              <FlameSvg className="w-4 h-4 text-accent-ink" />
              {stats?.streak ?? 0}
            </span>
          </div>
          <span className="mt-4 sticker flex items-center justify-center min-h-[48px] rounded-tl-[18px] rounded-tr-[12px] rounded-br-[16px] rounded-bl-[10px] border-2 border-ink bg-accent text-on-accent font-display font-bold text-lg">
            {stats?.playedToday ? 'See your streak' : 'Play now'}
          </span>
        </Link>

        {/* Level path */}
        <Link href="/level-path" className={CARD}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-ink-2 uppercase tracking-widest mb-1">Level path</p>
              <h2 className="text-xl font-display text-ink truncate">
                {next ? `${next.chapter} · Level ${next.numberInChapter}` : ' '}
              </h2>
            </div>
            <MapSvg className="w-7 h-7 text-ink-2 shrink-0" />
          </div>
          <p className="mt-3 flex items-center gap-1 font-body font-extrabold text-accent-ink">
            {stats && stats.levels > 0 ? 'Continue' : 'Start the journey'}
            <ChevronRightSvg className="w-4 h-4" />
          </p>
        </Link>

        <div className="grid grid-cols-2 gap-5">
          <Link href="/play/race/lobby" className={`${CARD} bg-[#FFD166]/40 dark:bg-surface flex flex-col items-center justify-center gap-2 text-center p-4`}>
            <RaceSvg className="w-8 h-8 text-ink" />
            <span className="font-display font-bold text-ink text-lg leading-tight">Race a friend</span>
          </Link>
          <Link href="/play/standard" className={`${CARD} flex flex-col items-center justify-center gap-2 text-center p-4`}>
            <ButterflySvg className="w-8 h-8 text-accent-ink" />
            <span className="font-display font-bold text-ink text-lg leading-tight">Free play</span>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <dl className="grid grid-cols-3 mt-8 pt-5 border-t-2 border-ink/10 text-center">
        {[
          { label: 'Levels', value: stats?.levels, icon: <StarSvg className="w-4 h-4 text-accent-ink" filled /> },
          { label: 'Wins', value: user ? stats?.wins : '–', icon: <RaceSvg className="w-4 h-4 text-accent-ink" /> },
          { label: 'Streak', value: stats?.streak, icon: <FlameSvg className="w-4 h-4 text-accent-ink" /> },
        ].map(s => (
          <div key={s.label} className="flex flex-col-reverse items-center">
            <dt className="flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider text-ink-2">
              {s.icon}
              {s.label}
            </dt>
            <dd className="text-2xl font-display font-bold text-ink tabular h-8">{s.value ?? ' '}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
