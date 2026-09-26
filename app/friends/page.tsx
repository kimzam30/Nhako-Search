'use client';
import { useMemo, useState } from 'react';
import { useCurrentUser } from '@/lib/auth/session';
import { useQuery } from '@/lib/data/cache';
import {
  boardKey,
  codeKey,
  fetchFriendAlbum,
  fetchFriends,
  fetchLeaderboard,
  fetchMyCode,
  friendsKey,
  normaliseCode,
  removeFriend,
  REQUEST_MESSAGES,
  requestByCode,
  respond,
  type BoardRow,
} from '@/lib/social/friends';
import { ACHIEVEMENT_BY_ID } from '@/lib/rewards/achievements';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { ListSkeleton, SkeletonBlock } from '@/components/ui/Skeleton';
import { Species } from '@/components/butterfly/Species';
import { CheckSvg, CloseSvg, CopySvg, FlameSvg, RaceSvg, ShareSvg, StarSvg, TokenSvg, TrophySvg, UserPlusSvg } from '@/components/ui/Icons';
import { DoodleButterfly } from '@/components/ui/Doodles';
import { toast } from '@/components/ui/Toast';

/*
 * Friends: your code to share, a box to add someone's, requests to answer,
 * and a leaderboard of you + your friends that can be ranked five ways.
 * Tapping a player opens their card: stats and the butterflies they've caught.
 */

type Metric = 'stars' | 'streak' | 'race_wins' | 'butterflies' | 'tokens_lifetime';

const METRICS: { id: Metric; label: string; icon: React.ReactNode; unit: string }[] = [
  { id: 'stars', label: 'Stars', icon: <StarSvg className="w-4 h-4 text-gold" filled />, unit: 'stars' },
  { id: 'streak', label: 'Streak', icon: <FlameSvg className="w-4 h-4 text-accent-ink" />, unit: 'day streak' },
  { id: 'race_wins', label: 'Wins', icon: <RaceSvg className="w-4 h-4 text-accent-ink" />, unit: 'race wins' },
  { id: 'butterflies', label: 'Album', icon: <DoodleButterfly className="w-5" />, unit: 'species' },
  { id: 'tokens_lifetime', label: 'Tokens', icon: <TokenSvg className="w-4 h-4" />, unit: 'tokens earned' },
];

const MEDALS = ['var(--gold)', 'var(--lav)', 'var(--word-6)'];

function Avatar({ name, url, size = 44 }: { name: string; url?: string; size?: number }) {
  return (
    <span
      className="shrink-0 rounded-full border-2 border-line bg-accent-soft overflow-hidden flex items-center justify-center font-display font-bold text-ink"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- Google CDN avatar
        <img src={url} alt="" width={size} height={size} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}

export default function FriendsPage() {
  const user = useCurrentUser();
  const uid = user?.id;

  if (user === undefined) {
    return (
      <Shell>
        <ListSkeleton rows={4} label="friends" />
      </Shell>
    );
  }
  if (!uid) {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center gap-4 p-6 bg-surface border-2 border-line shadow-[4px_5px_0_0_var(--line)]" style={{ borderRadius: '24px 14px 26px 16px' }}>
          <TrophySvg className="w-16 h-16 text-gold" />
          <h2 className="font-display font-bold text-2xl text-ink">Play with friends</h2>
          <p className="font-bold text-ink-2">
            Sign in to get your friend code, add friends, and see how your stars, streaks and butterflies stack up.
          </p>
          <ButtonLink href="/sign-in" fullWidth>
            Sign in with Google
          </ButtonLink>
        </div>
      </Shell>
    );
  }
  return <FriendsView uid={uid} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col w-full max-w-lg md:max-w-2xl mx-auto px-5 pb-8 gap-6" style={{ paddingTop: 'max(1.25rem, var(--safe-top))' }}>
      <header>
        <h1 className="text-4xl font-display text-ink">Friends</h1>
        <p className="font-accent text-2xl text-ink-2 -rotate-1">who&rsquo;s catching the most?</p>
      </header>
      {children}
    </div>
  );
}

function FriendsView({ uid }: { uid: string }) {
  const code = useQuery(codeKey(uid), fetchMyCode, { persist: true });
  const friends = useQuery(friendsKey(uid), fetchFriends, { persist: true });
  const board = useQuery(boardKey(uid), fetchLeaderboard, { persist: true });
  const [metric, setMetric] = useState<Metric>('stars');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [selected, setSelected] = useState<BoardRow | null>(null);

  const incoming = (friends.data ?? []).filter(f => f.status === 'pending' && f.incoming);
  const outgoing = (friends.data ?? []).filter(f => f.status === 'pending' && !f.incoming);

  const ranked = useMemo(() => {
    const rows = [...(board.data ?? [])];
    rows.sort((a, b) => b[metric] - a[metric] || a.display_name.localeCompare(b.display_name));
    return rows;
  }, [board.data, metric]);
  const m = METRICS.find(x => x.id === metric)!;

  const shareText = code.data ? `Add me on NhakoSearch! My friend code is ${code.data}` : '';
  const copy = async () => {
    if (!code.data) return;
    try {
      await navigator.clipboard.writeText(code.data);
      toast({ title: 'Code copied', body: code.data });
    } catch {
      toast({ title: 'Your code', body: code.data });
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'NhakoSearch', text: shareText, url: window.location.origin });
        return;
      } catch {
        /* cancelled */
      }
    }
    void copy();
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = normaliseCode(draft);
    if (c.length !== 6) {
      setMessage({ text: 'Friend codes are 6 letters and numbers.', ok: false });
      return;
    }
    setSending(true);
    const result = await requestByCode(c);
    setSending(false);
    setMessage({ text: REQUEST_MESSAGES[result], ok: result === 'sent' || result === 'accepted' });
    if (result === 'sent' || result === 'accepted') setDraft('');
  };

  return (
    <Shell>
      {/* Your code */}
      <section
        aria-labelledby="my-code"
        className="flex items-center gap-3 p-4 bg-accent-soft border-2 border-line shadow-[4px_5px_0_0_var(--line)]"
        style={{ borderRadius: '22px 14px 24px 16px' }}
      >
        <div className="flex-1 min-w-0">
          <h2 id="my-code" className="text-[11px] font-extrabold uppercase tracking-widest text-ink-2">
            Your friend code
          </h2>
          {code.data ? (
            <p className="font-display font-bold text-4xl text-ink tracking-[0.18em] tabular select-all" aria-label={`Your code: ${code.data.split('').join(' ')}`}>
              {code.data}
            </p>
          ) : code.error ? (
            <p className="font-bold text-ink-2">Couldn&rsquo;t load your code.</p>
          ) : (
            <SkeletonBlock className="h-10 w-44 mt-1" />
          )}
        </div>
        <button type="button" onClick={copy} aria-label="Copy code" className="press w-12 h-12 flex items-center justify-center rounded-full border-2 border-line bg-surface text-ink shadow-[2px_3px_0_0_var(--line)]">
          <CopySvg className="w-5 h-5" />
        </button>
        <button type="button" onClick={share} aria-label="Share code" className="press w-12 h-12 flex items-center justify-center rounded-full border-2 border-line bg-accent text-on-accent shadow-[2px_3px_0_0_var(--line)]">
          <ShareSvg className="w-5 h-5" />
        </button>
      </section>

      {/* Add a friend */}
      <form onSubmit={send} className="flex flex-col gap-2" noValidate>
        <label htmlFor="friend-code" className="text-xs font-extrabold uppercase tracking-widest text-ink-2">
          Add a friend
        </label>
        <div className="flex gap-2">
          <input
            id="friend-code"
            value={draft}
            onChange={e => {
              setDraft(normaliseCode(e.target.value));
              setMessage(null);
            }}
            placeholder="ABC123"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="send"
            maxLength={6}
            aria-describedby="friend-code-msg"
            className="flex-1 min-w-0 min-h-[52px] bg-surface border-2 border-line rounded-2xl px-4 font-display font-bold text-2xl tracking-[0.2em] text-ink uppercase outline-none focus:border-accent placeholder:text-ink/25"
          />
          <Button type="submit" disabled={sending || draft.length !== 6} className="px-4" aria-label="Send friend request">
            <UserPlusSvg className="w-6 h-6" />
            <span className="hidden sm:inline">{sending ? 'Sending…' : 'Add'}</span>
          </Button>
        </div>
        <p id="friend-code-msg" role={message && !message.ok ? 'alert' : 'status'} className={`min-h-5 text-sm font-bold ${message?.ok ? 'text-ink' : 'text-accent-ink'}`}>
          {message?.text ?? ''}
        </p>
      </form>

      {/* Requests */}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <section aria-labelledby="requests" className="flex flex-col gap-2.5">
          <h2 id="requests" className="text-xs font-extrabold uppercase tracking-widest text-ink-2">
            Requests
          </h2>
          {incoming.map(f => (
            <div key={f.user_id} className="flex items-center gap-3 p-3 bg-surface border-2 border-line rounded-[18px] shadow-[3px_4px_0_0_var(--line)]">
              <Avatar name={f.display_name} url={f.avatar_url} />
              <span className="flex-1 min-w-0">
                <span className="block font-display font-bold text-ink truncate">{f.display_name}</span>
                <span className="block text-xs font-extrabold text-ink-2">wants to be friends</span>
              </span>
              <button
                type="button"
                onClick={() => respond(f.user_id, false)}
                aria-label={`Decline ${f.display_name}`}
                className="press w-11 h-11 flex items-center justify-center rounded-full border-2 border-line bg-background text-ink"
              >
                <CloseSvg className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (await respond(f.user_id, true)) toast({ title: `You and ${f.display_name} are friends`, icon: <TrophySvg className="w-8 h-8 text-gold" /> });
                }}
                aria-label={`Accept ${f.display_name}`}
                className="press w-11 h-11 flex items-center justify-center rounded-full border-2 border-line bg-accent text-on-accent shadow-[2px_3px_0_0_var(--line)]"
              >
                <CheckSvg className="w-5 h-5" />
              </button>
            </div>
          ))}
          {outgoing.map(f => (
            <div key={f.user_id} className="flex items-center gap-3 p-3 border-2 border-dashed border-ink/25 rounded-[18px]">
              <Avatar name={f.display_name} url={f.avatar_url} size={36} />
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-ink truncate">{f.display_name}</span>
                <span className="block text-xs font-extrabold text-ink-2">request sent</span>
              </span>
              <button type="button" onClick={() => removeFriend(f.user_id)} className="press min-h-[44px] px-3 rounded-full text-sm font-extrabold text-ink-2">
                Cancel
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Leaderboard */}
      <section aria-labelledby="board" className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <h2 id="board" className="font-display text-2xl text-ink">
            Leaderboard
          </h2>
          {board.isRefreshing && <span className="text-xs font-extrabold text-ink-2">updating…</span>}
        </div>
        <div role="radiogroup" aria-label="Rank by" className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {METRICS.map(x => (
            <button
              key={x.id}
              type="button"
              role="radio"
              aria-checked={metric === x.id}
              onClick={() => setMetric(x.id)}
              className={`press shrink-0 flex items-center gap-1.5 min-h-[40px] px-3 rounded-full border-2 font-body font-extrabold text-sm ${
                metric === x.id ? 'bg-accent text-on-accent border-line shadow-[2px_3px_0_0_var(--line)]' : 'bg-surface text-ink border-line/30'
              }`}
            >
              {x.icon}
              {x.label}
            </button>
          ))}
        </div>

        {board.isLoading ? (
          <ListSkeleton rows={3} label="leaderboard" />
        ) : board.error && !board.data ? (
          <div className="p-4 text-center border-2 border-dashed border-ink/25 rounded-2xl">
            <p className="font-bold text-ink-2 mb-3">Couldn&rsquo;t load the leaderboard.</p>
            <Button variant="secondary" onClick={() => board.refresh()}>
              Try again
            </Button>
          </div>
        ) : (
          <ol className="flex flex-col gap-2.5">
            {ranked.map((r, i) => (
              <li key={r.user_id}>
                <button
                  type="button"
                  onClick={() => setSelected(r)}
                  className={`press w-full flex items-center gap-3 p-3 text-left border-2 border-line rounded-[18px] ${
                    r.is_me ? 'bg-accent-soft shadow-[3px_4px_0_0_var(--line)]' : 'bg-surface shadow-[2px_3px_0_0_var(--line)]'
                  }`}
                  aria-label={`Rank ${i + 1}, ${r.is_me ? 'you' : r.display_name}, ${r[metric]} ${m.unit}`}
                >
                  <span
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border-2 border-line font-display font-bold text-sm text-on-accent tabular"
                    style={{ background: MEDALS[i] ?? 'var(--tile)', color: i < 3 ? 'var(--on-accent)' : 'var(--ink)' }}
                  >
                    {i + 1}
                  </span>
                  <Avatar name={r.display_name} url={r.avatar_url} size={40} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-display font-bold text-ink truncate">{r.is_me ? `${r.display_name} (you)` : r.display_name}</span>
                    <span className="block text-xs font-extrabold text-ink-2 tabular">
                      {r.levels} levels · {r.race_wins} wins · {r.butterflies} species
                    </span>
                  </span>
                  <span className="shrink-0 flex items-center gap-1 font-display font-bold text-xl text-ink tabular">
                    {m.icon}
                    {r[metric].toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
        {!board.isLoading && ranked.length <= 1 && (
          <p className="text-center font-bold text-ink-2 px-4">
            It&rsquo;s just you so far. Share your code, or add your race partner from the results screen.
          </p>
        )}
      </section>

      <FriendSheet row={selected} onClose={() => setSelected(null)} />
    </Shell>
  );
}

function FriendSheet({ row, onClose }: { row: BoardRow | null; onClose: () => void }) {
  const album = useQuery(row ? `album:${row.user_id}` : null, () => fetchFriendAlbum(row!.user_id));
  const [confirm, setConfirm] = useState(false);
  const stats = row
    ? [
        { label: 'Stars', value: row.stars },
        { label: 'Levels', value: row.levels },
        { label: 'Dailies', value: row.daily_days },
        { label: 'Streak', value: row.streak, extra: `best ${row.best_streak}` },
        { label: 'Race record', value: `${row.race_wins}–${Math.max(0, row.races - row.race_wins)}` },
        { label: 'Tokens earned', value: row.tokens_lifetime },
      ]
    : [];
  const species = (album.data ?? []).map(id => ACHIEVEMENT_BY_ID.get(id.slice(4))).filter(Boolean);

  return (
    <Sheet
      open={!!row}
      onClose={() => {
        setConfirm(false);
        onClose();
      }}
      title={row ? (row.is_me ? `${row.display_name} (you)` : row.display_name) : undefined}
    >
      {row && (
        <div className="flex flex-col gap-5 pb-2">
          <dl className="grid grid-cols-3 gap-3">
            {stats.map(s => (
              <div key={s.label} className="flex flex-col-reverse items-center p-2 rounded-2xl bg-background border-2 border-ink/10">
                <dt className="text-[10px] font-extrabold uppercase tracking-wider text-ink-2 text-center">{s.label}</dt>
                <dd className="font-display font-bold text-xl text-ink tabular">
                  {s.value}
                  {s.extra && <span className="block text-[10px] font-extrabold text-ink-2 text-center">{s.extra}</span>}
                </dd>
              </div>
            ))}
          </dl>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-ink-2 mb-2">
              Butterflies caught · {row.butterflies}
            </h3>
            {album.isLoading ? (
              <SkeletonBlock className="h-14 w-full" />
            ) : species.length ? (
              <ul className="flex flex-wrap gap-2">
                {species.map(a => (
                  <li key={a!.id} title={a!.species} className="w-12 h-12 flex items-center justify-center rounded-2xl border-2 border-line bg-tile">
                    <Species spec={a!.spec} className="w-10" title={a!.species} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm font-bold text-ink-2">None yet.</p>
            )}
          </div>
          {!row.is_me &&
            (confirm ? (
              <div className="flex gap-2">
                <Button variant="secondary" fullWidth onClick={() => setConfirm(false)}>
                  Keep
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={async () => {
                    await removeFriend(row.user_id);
                    setConfirm(false);
                    onClose();
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirm(true)} className="press self-center min-h-[44px] px-4 text-sm font-extrabold text-ink-2 underline decoration-2">
                Remove friend
              </button>
            ))}
        </div>
      )}
    </Sheet>
  );
}
