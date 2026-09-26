'use client';
import { supabase } from '@/lib/multiplayer/supabase';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GearSvg } from '@/components/ui/Icons';
import { DoodleButterfly } from '@/components/ui/Doodles';
import { Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { wordsFoundForLevels } from '@/lib/levels/data';
import { checkDailyStreak, longestRun } from '@/lib/daily/logic';
import { getUserProfile } from '@/lib/auth/profile';
import { readJSON } from '@/lib/storage';
import type { CollectionEntry } from '@/lib/types';

// The daily challenge is a medium puzzle: 8 words.
const WORDS_PER_DAILY = 8;
// The album always shows at least this many slots, then grows in whole rows.
const MIN_SLOTS = 20;

interface Stats {
  levels: number;
  wins: number;
  played: number;
  streak: number;
  bestStreak: number;
  wordsFound: number;
}

interface Styled extends CollectionEntry {
  title: string;
  color: string;
  bg: string;
  /** Filled doodle wings (upper, lower): the ink outline carries the contrast. */
  wings: [string, string];
}

const WINGS: Record<string, [string, string]> = {
  'Together butterfly': ['var(--word-7)', 'var(--word-2)'],
  Daily: ['var(--word-4)', 'var(--word-6)'],
  'Garden skimmer': ['var(--word-3)', 'var(--word-8)'],
  'Rainy blue': ['var(--word-5)', 'var(--word-2)'],
  'Cozy moth': ['var(--word-6)', 'var(--word-1)'],
  Nightwing: ['var(--word-2)', 'var(--word-5)'],
  Heartwing: ['var(--word-1)', 'var(--word-7)'],
  Swallowtail: ['var(--word-4)', 'var(--word-1)'],
  Monarch: ['var(--word-6)', 'var(--word-4)'],
};

function styleFor(b: CollectionEntry): Styled {
  const id = b.butterfly_style_id ?? '';
  const chapter = id.match(/level-(c\d+)/)?.[1];
  if (id.startsWith('together-'))
    return { ...b, title: 'Together butterfly', color: 'text-wing-together', bg: 'bg-accent/10', wings: WINGS['Together butterfly'] };
  if (id.startsWith('daily-'))
    return { ...b, title: `Daily · ${id.slice(6)}`, color: 'text-wing-sun', bg: 'bg-background', wings: WINGS.Daily };
  const byChapter: Record<string, [string, string]> = {
    c1: ['Garden skimmer', 'text-wing-garden'], c7: ['Garden skimmer', 'text-wing-garden'],
    c2: ['Rainy blue', 'text-wing-rainy'], c8: ['Rainy blue', 'text-wing-rainy'],
    c3: ['Cozy moth', 'text-wing-cozy'], c9: ['Cozy moth', 'text-wing-cozy'],
    c4: ['Nightwing', 'text-ink'], c10: ['Nightwing', 'text-ink'],
    c5: ['Heartwing', 'text-accent-ink'], c11: ['Heartwing', 'text-accent-ink'],
    c6: ['Swallowtail', 'text-accent-ink'], c12: ['Swallowtail', 'text-accent-ink'],
  };
  const [title, color] = (chapter && byChapter[chapter]) || ['Monarch', 'text-accent-ink'];
  return { ...b, title, color, bg: 'bg-background', wings: WINGS[title] ?? WINGS.Monarch };
}

export default function ProfilePage() {
  const router = useRouter();
  const [collection, setCollection] = useState<Styled[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<Styled | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: userObj }, profile, daily] = await Promise.all([
        supabase.auth.getUser(),
        getUserProfile(),
        checkDailyStreak(),
      ]);
      const user = userObj.user;
      let coll: CollectionEntry[] = [];
      let next: Stats;

      if (user) {
        const [{ data: c }, { data: levelRows }, { count: wins }, { count: played }, { data: logs }] = await Promise.all([
          supabase.from('butterfly_collection').select('*').eq('user_id', user.id),
          supabase.from('level_progress').select('level_id').eq('user_id', user.id),
          supabase.from('race_history').select('*', { count: 'exact', head: true }).eq('winner', user.id),
          supabase
            .from('race_history')
            .select('*', { count: 'exact', head: true })
            .or(`player_a.eq.${user.id},player_b.eq.${user.id}`),
          supabase.from('daily_challenge_log').select('challenge_date').eq('user_id', user.id),
        ]);
        coll = c ?? [];
        const days = (logs ?? []).map(l => String(l.challenge_date));
        next = {
          levels: levelRows?.length ?? 0,
          wins: wins ?? 0,
          played: played ?? 0,
          streak: daily.streak,
          bestStreak: Math.max(longestRun(days), daily.streak),
          wordsFound: wordsFoundForLevels((levelRows ?? []).map(r => r.level_id)) + days.length * WORDS_PER_DAILY,
        };
      } else {
        coll = readJSON<CollectionEntry[]>('nhako_collection', []);
        const localLevels = readJSON<Record<string, unknown>>('nhako_levels', {});
        const localDaily = readJSON<{ history?: string[]; lastDate?: string }>('nhako_daily', {});
        const days = [...new Set([...(localDaily.history ?? []), ...(localDaily.lastDate ? [localDaily.lastDate] : [])])];
        next = {
          levels: Object.keys(localLevels).length,
          wins: 0,
          played: 0,
          streak: daily.streak,
          bestStreak: Math.max(longestRun(days), daily.streak),
          wordsFound: wordsFoundForLevels(Object.keys(localLevels)) + days.length * WORDS_PER_DAILY,
        };
      }

      // Newest first, so the latest reward is the first thing you see.
      const sorted = [...coll].sort((a, b) => String(b.earned_at ?? '').localeCompare(String(a.earned_at ?? '')));
      if (cancelled) return;
      setSignedIn(!!user);
      setName(profile.displayName);
      setAvatar(profile.avatarUrl);
      setCollection(sorted.map(styleFor));
      setStats(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('nhako_guest_mode');
    router.replace('/sign-in');
  };

  // Every butterfly is shown — the album used to stop at 30 and silently hide
  // the rest. Empty slots pad to at least MIN_SLOTS, then to a whole row of 5.
  const count = collection?.length ?? 0;
  const slots = Math.max(MIN_SLOTS, Math.ceil(count / 5) * 5);

  const statItems = [
    { label: 'Levels done', value: stats?.levels },
    { label: 'Words found', value: stats?.wordsFound },
    { label: 'Race record', value: stats ? `${stats.wins}–${Math.max(0, stats.played - stats.wins)}` : undefined },
    { label: 'Streak', value: stats ? `${stats.streak}` : undefined, extra: stats ? `best ${stats.bestStreak}` : undefined },
  ];

  return (
    <div className="flex flex-col w-full max-w-lg md:max-w-2xl mx-auto px-5 pb-6" style={{ paddingTop: 'max(1.25rem, var(--safe-top))' }}>
      <header className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 w-14 h-14 rounded-full border-2 border-line bg-surface overflow-hidden flex items-center justify-center font-display text-2xl text-ink">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- Google CDN avatar
              <img src={avatar} alt="" width={56} height={56} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              name.charAt(0).toUpperCase() || ' '
            )}
          </span>
          <div className="min-w-0">
            <h1 className="text-3xl font-display text-ink truncate">{name || ' '}</h1>
            <p className="text-sm font-extrabold text-ink-2">
              {signedIn === null ? ' ' : signedIn ? 'Signed in with Google' : 'Guest · saved on this device'}
            </p>
          </div>
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="press shrink-0 flex items-center justify-center w-12 h-12 rounded-full border-2 border-line bg-surface text-ink"
        >
          <GearSvg className="w-6 h-6" />
        </Link>
      </header>

      <Card className="mb-8">
        <dl className="grid grid-cols-2 gap-y-5 gap-x-4">
          {statItems.map(s => (
            <div key={s.label} className="flex flex-col-reverse">
              <dt className="text-xs font-extrabold uppercase tracking-widest text-ink-2">{s.label}</dt>
              <dd className="flex items-baseline gap-2 min-h-9">
                {s.value === undefined ? (
                  <span className="animate-pulse bg-ink/10 h-8 w-14 rounded" />
                ) : (
                  <span className="text-3xl font-display font-bold text-ink tabular">{s.value}</span>
                )}
                {s.extra && <span className="text-sm font-extrabold text-ink-2 tabular">{s.extra}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-2xl font-display text-ink">Butterfly collection</h2>
        <span className="text-sm font-extrabold text-ink-2 tabular">{collection ? `${count} collected` : ''}</span>
      </div>

      <div className="bg-surface p-4 sm:p-6 rounded-3xl border-2 border-line shadow-[4px_5px_0_0_var(--line)]">
        {collection && count === 0 && (
          <p className="text-center font-body font-bold text-ink-2 mb-4">
            Finish a level or today&rsquo;s puzzle to catch your first butterfly.
          </p>
        )}
        <ul className="grid grid-cols-5 gap-2.5 sm:gap-4">
          {Array.from({ length: slots }).map((_, i) => {
            const b = collection?.[i];
            const radius = `${12 + (i % 5)}px ${18 - (i % 3)}px ${14 + (i % 4)}px ${16 - (i % 2)}px`;
            if (!b) {
              return (
                <li
                  key={`empty-${i}`}
                  aria-hidden="true"
                  className="aspect-square bg-ink/5 border-2 border-dashed border-ink/20 flex items-center justify-center"
                  style={{ borderRadius: radius }}
                >
                  <DoodleButterfly className="w-8 opacity-25" wing="transparent" wing2="transparent" stroke="var(--ink-2)" />
                </li>
              );
            }
            return (
              <li key={b.butterfly_style_id}>
                <button
                  type="button"
                  onClick={() => setSelected(b)}
                  aria-label={`${b.title}${i === 0 ? ', newest' : ''}`}
                  className={`press w-full aspect-square ${b.bg} border-2 border-line shadow-[2px_2px_0_0_var(--line)] flex items-center justify-center relative`}
                  style={{ borderRadius: radius }}
                >
                  <DoodleButterfly className="w-9 sm:w-11" wing={b.wings[0]} wing2={b.wings[1]} />
                  {i === 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-accent border-2 border-line" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {signedIn === false && (
          <ButtonLink href="/sign-in" fullWidth>
            Sign in to keep your progress
          </ButtonLink>
        )}
        {signedIn && (
          <Button onClick={handleSignOut} fullWidth variant="secondary">
            Sign out
          </Button>
        )}
      </div>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected?.title}>
        {selected && (
          <div className="flex flex-col items-center text-center gap-2 pb-2">
            <DoodleButterfly className="w-24 mb-2 idle-float" wing={selected.wings[0]} wing2={selected.wings[1]} />
            <p className="text-ink font-body">
              Earned from <strong>{selected.earned_from || 'gameplay'}</strong>
            </p>
            <p className="text-ink-2 font-body text-sm font-bold">
              {selected.earned_at ? new Date(selected.earned_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : ''}
            </p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
