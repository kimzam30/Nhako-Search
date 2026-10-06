'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { supabase } from '@/lib/multiplayer/supabase';
import { ChevronRightSvg, HelpSvg, GearSvg, TrophySvg } from '@/components/ui/Icons';
import { Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { TokenPill } from '@/components/rewards/TokenPill';
import { Species } from '@/components/butterfly/Species';
import { usePlayer } from '@/lib/data/player';
import { clearCache } from '@/lib/data/cache';
import { readJournal } from '@/lib/rewards/journal';
import { ACHIEVEMENT_BY_ID, ACHIEVEMENTS, unlockedIds, wordsFound } from '@/lib/rewards/achievements';

/*
 * "You": who you are, how you are doing, and the two collections that grow:
 * the butterfly album and your friends. Everything comes from the shared
 * summary, so the tab opens with its numbers already filled in.
 */
export default function ProfilePage() {
  const router = useRouter();
  const { summary } = usePlayer();

  const view = useMemo(() => {
    if (!summary) return null;
    const journal = readJournal();
    const unlocked = unlockedIds(summary.collection);
    const latest = summary.collection
      .filter(c => c.butterfly_style_id.startsWith('ach-') && ACHIEVEMENT_BY_ID.has(c.butterfly_style_id.slice(4)))
      .sort((a, b) => String(b.earned_at ?? '').localeCompare(String(a.earned_at ?? '')))
      .slice(0, 5)
      .map(c => ACHIEVEMENT_BY_ID.get(c.butterfly_style_id.slice(4))!);
    return {
      unlocked: unlocked.size,
      latest,
      stats: [
        { label: 'Levels done', value: summary.levels.filter(l => (l.stars ?? 0) > 0).length },
        { label: 'Stars', value: summary.levels.reduce((n, l) => n + (l.stars ?? 0), 0) },
        { label: 'Words', value: wordsFound({ summary, journal }).toLocaleString() },
        { label: 'Race record', value: `${summary.raceWins}–${Math.max(0, summary.races - summary.raceWins)}` },
        { label: 'Streak', value: summary.streak, extra: `best ${summary.bestStreak}` },
        { label: 'Puzzles', value: Math.max(journal.puzzles, summary.levels.length + summary.dailyDates.length) },
      ],
    };
  }, [summary]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearCache();
    try {
      localStorage.removeItem('nhako_guest_mode');
    } catch {
      /* private mode */
    }
    // A one-way door: Back must not return to a signed-in profile.
    router.replace('/sign-in');
  };

  return (
    <div className="flex flex-col w-full max-w-lg md:max-w-2xl mx-auto px-5 pb-6 gap-6" style={{ paddingTop: 'max(1.25rem, var(--safe-top))' }}>
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 w-14 h-14 rounded-full border-2 border-line bg-surface overflow-hidden flex items-center justify-center font-display text-2xl text-ink shadow-[2px_3px_0_0_var(--line)]">
            {summary?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- Google CDN avatar
              <img src={summary.avatar} alt="" width={56} height={56} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              summary?.name.charAt(0).toUpperCase() || ' '
            )}
          </span>
          <div className="min-w-0">
            <h1 className="text-3xl font-display text-ink truncate">{summary?.name ?? ' '}</h1>
            <p className="text-sm font-extrabold text-ink-2">
              {!summary ? ' ' : summary.isGuest ? 'Guest · saved on this device' : 'Signed in with Google'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TokenPill tokens={summary?.tokens} />
          <Link
            href="/settings"
            aria-label="Settings"
            className="press flex items-center justify-center w-11 h-11 rounded-full border-2 border-line bg-surface text-ink shadow-[2px_3px_0_0_var(--line)]"
          >
            <GearSvg className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <Card>
        <dl className="grid grid-cols-3 gap-y-5 gap-x-3">
          {(view?.stats ?? Array.from({ length: 6 }, (_, i) => ({ label: ['Levels done', 'Stars', 'Words', 'Race record', 'Streak', 'Puzzles'][i], value: undefined, extra: undefined }))).map(s => (
            <div key={s.label} className="flex flex-col-reverse min-w-0">
              <dt className="text-[11px] font-extrabold uppercase tracking-wider text-ink-2 truncate">{s.label}</dt>
              <dd className="flex items-baseline gap-1.5 min-h-9">
                {s.value === undefined ? (
                  <SkeletonBlock className="h-8 w-12" />
                ) : (
                  <span className="text-2xl font-display font-bold text-ink tabular">{s.value}</span>
                )}
                {'extra' in s && s.extra && <span className="text-xs font-extrabold text-ink-2 tabular">{s.extra}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Album preview: the latest catches, and how far the collection goes. */}
      <Link
        href="/album"
        className="press flex flex-col gap-3 p-4 bg-lav-soft border-2 border-line shadow-[4px_5px_0_0_var(--line)]"
        style={{ borderRadius: '22px 14px 24px 16px' }}
      >
        <span className="flex items-center justify-between gap-3">
          <span className="flex flex-col">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-ink-2">Butterfly album</span>
            <span className="font-display font-bold text-ink text-xl tabular">
              {view ? `${view.unlocked} of ${ACHIEVEMENTS.length} species` : ' '}
            </span>
          </span>
          <ChevronRightSvg className="w-6 h-6 text-ink" />
        </span>
        <div className="nera-track !p-0 h-2.5" role="progressbar" aria-label="Album progress" aria-valuemin={0} aria-valuemax={ACHIEVEMENTS.length} aria-valuenow={view?.unlocked ?? 0}>
          <div className="nera-fill" style={{ width: `${Math.max(3, ((view?.unlocked ?? 0) / ACHIEVEMENTS.length) * 100)}%` }} />
        </div>
        <span className="flex gap-2 min-h-12">
          {view?.latest.length
            ? view.latest.map(a => (
                <span key={a.id} className="w-12 h-12 flex items-center justify-center rounded-2xl border-2 border-line bg-tile">
                  <Species spec={a.spec} className="w-10" />
                </span>
              ))
            : view && <span className="self-center text-sm font-bold text-ink-2">Finish a puzzle to catch your first species.</span>}
        </span>
      </Link>

      {/* Friends + leaderboard. */}
      <Link
        href="/friends"
        className="press flex items-center gap-3 p-4 bg-surface border-2 border-line shadow-[4px_5px_0_0_var(--line)]"
        style={{ borderRadius: '16px 24px 18px 22px' }}
      >
        <span className="relative shrink-0 w-12 h-12 flex items-center justify-center rounded-full border-2 border-line bg-accent-soft">
          <TrophySvg className="w-7 h-7 text-gold" />
          {(summary?.pendingRequests ?? 0) > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 flex items-center justify-center rounded-full border-2 border-line bg-accent text-on-accent text-[11px] font-extrabold tabular">
              {summary!.pendingRequests}
            </span>
          )}
        </span>
        <span className="flex-1 flex flex-col min-w-0">
          <span className="font-display font-bold text-ink text-xl">Friends &amp; leaderboard</span>
          <span className="text-sm font-bold text-ink-2 truncate">
            {!summary
              ? ' '
              : summary.isGuest
                ? 'Sign in to add friends'
                : summary.pendingRequests
                  ? `${summary.pendingRequests} request${summary.pendingRequests > 1 ? 's' : ''} waiting`
                  : summary.friends
                    ? `${summary.friends} friend${summary.friends > 1 ? 's' : ''}`
                    : 'Add friends with a code'}
          </span>
        </span>
        <ChevronRightSvg className="w-6 h-6 text-ink" />
      </Link>

      <Link
        href="/how-to-play"
        className="press flex items-center gap-3 p-4 bg-surface border-2 border-line shadow-[4px_5px_0_0_var(--line)]"
        style={{ borderRadius: '22px 16px 20px 14px' }}
      >
        <span className="shrink-0 w-12 h-12 flex items-center justify-center rounded-full border-2 border-line bg-accent-soft">
          <HelpSvg className="w-7 h-7 text-ink" />
        </span>
        <span className="flex-1 flex flex-col min-w-0">
          <span className="font-display font-bold text-ink text-xl">How to play</span>
          <span className="text-sm font-bold text-ink-2 truncate">Directions, hints, multiplayer, installing</span>
        </span>
        <ChevronRightSvg className="w-6 h-6 text-ink" />
      </Link>

      <div className="flex flex-col gap-3">
        {summary?.isGuest && (
          <ButtonLink href="/sign-in" fullWidth>
            Sign in to keep your progress
          </ButtonLink>
        )}
        {summary && !summary.isGuest && (
          <Button onClick={handleSignOut} fullWidth variant="secondary">
            Sign out
          </Button>
        )}
      </div>
    </div>
  );
}
