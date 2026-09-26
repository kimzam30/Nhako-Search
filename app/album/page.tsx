'use client';
import { useMemo, useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Species } from '@/components/butterfly/Species';
import { GridSkeleton } from '@/components/ui/Skeleton';
import { LockSvg, TokenSvg } from '@/components/ui/Icons';
import { usePlayer } from '@/lib/data/player';
import { readJournal } from '@/lib/rewards/journal';
import { ACHIEVEMENT_BONUS } from '@/lib/rewards/economy';
import { ACHIEVEMENTS, achievementStyleId, type Achievement, type Category, type Tier } from '@/lib/rewards/achievements';
import { seededSpecies, type SpeciesSpec } from '@/lib/rewards/species';

/*
 * The butterfly album: every species is an achievement with its own design.
 * Caught ones are in colour; missing ones are ink outlines that say how to
 * catch them and how close you are, so the album is also a to-do list.
 * Keepsakes (one per daily puzzle, one per co-op clear) are drawn from their
 * date, so no two days' butterflies look alike.
 */

const CATEGORIES: Category[] = ['Journey', 'Daily', 'Skill', 'Race', 'Explorer'];
type Filter = 'all' | 'caught' | 'missing';

const TIER_STYLE: Record<Tier, { label: string; ring: string }> = {
  common: { label: 'Common', ring: 'border-line' },
  rare: { label: 'Rare', ring: 'border-line ring-2 ring-offset-2 ring-offset-surface ring-[var(--lav)]' },
  legendary: { label: 'Legendary', ring: 'border-line ring-[3px] ring-offset-2 ring-offset-surface ring-[var(--gold)]' },
};

interface Selected {
  title: string;
  species: string;
  spec: SpeciesSpec;
  description: string;
  caught: boolean;
  earnedAt?: string;
  progress?: [number, number];
  tier?: Tier;
}

export default function AlbumPage() {
  const { summary } = usePlayer();
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Selected | null>(null);

  const data = useMemo(() => {
    if (!summary) return null;
    const ctx = { summary, journal: readJournal() };
    const earned = new Map(summary.collection.map(c => [c.butterfly_style_id, c.earned_at]));
    const items = ACHIEVEMENTS.map(a => ({
      a,
      caught: earned.has(achievementStyleId(a.id)),
      earnedAt: earned.get(achievementStyleId(a.id)),
      progress: a.progress(ctx),
    }));
    const keepsakes = summary.collection
      .filter(c => c.butterfly_style_id.startsWith('daily-') || c.butterfly_style_id.startsWith('together-'))
      .sort((x, y) => String(y.earned_at ?? '').localeCompare(String(x.earned_at ?? '')))
      .map(c => {
        const id = c.butterfly_style_id;
        const daily = id.startsWith('daily-');
        const date = daily ? id.slice(6) : id.split('-').slice(-3).join('-');
        return {
          id,
          spec: seededSpecies(id),
          title: daily ? 'Daily stamp' : 'Together',
          date,
          earnedAt: c.earned_at,
        };
      });
    return { items, keepsakes, caught: items.filter(i => i.caught).length };
  }, [summary]);

  const open = (a: Achievement, caught: boolean, earnedAt: string | undefined, progress: [number, number]) =>
    setSelected({ title: a.title, species: a.species, spec: a.spec, description: a.description, caught, earnedAt, progress, tier: a.tier });

  return (
    <div className="flex flex-col w-full max-w-lg md:max-w-3xl mx-auto px-5 pb-8" style={{ paddingTop: 'max(1.25rem, var(--safe-top))' }}>
      <h1 className="text-4xl font-display text-ink">Butterfly album</h1>
      <p className="font-accent text-2xl text-ink-2 -rotate-1 mb-4">
        {data ? `${data.caught} of ${ACHIEVEMENTS.length} species caught` : ' '}
      </p>

      <div role="radiogroup" aria-label="Show" className="grid grid-cols-3 gap-1 p-1 mb-6 bg-surface border-2 border-line rounded-2xl shadow-[3px_4px_0_0_var(--line)]">
        {(['all', 'caught', 'missing'] as Filter[]).map(f => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={filter === f}
            onClick={() => setFilter(f)}
            className={`press min-h-[44px] rounded-xl font-body font-extrabold capitalize transition-colors ${
              filter === f ? 'bg-accent text-on-accent shadow-[0_2px_0_var(--line)]' : 'text-ink-2'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {!data ? (
        <GridSkeleton />
      ) : (
        <>
          {CATEGORIES.map(cat => {
            const list = data.items.filter(i => i.a.category === cat && (filter === 'all' || (filter === 'caught') === i.caught));
            if (list.length === 0) return null;
            return (
              <section key={cat} aria-labelledby={`cat-${cat}`} className="mb-8">
                <h2 id={`cat-${cat}`} className="flex items-baseline justify-between mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-ink-2">{cat}</span>
                  <span className="text-xs font-extrabold text-ink-2 tabular">
                    {data.items.filter(i => i.a.category === cat && i.caught).length}/{data.items.filter(i => i.a.category === cat).length}
                  </span>
                </h2>
                <ul className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {list.map(({ a, caught, earnedAt, progress }, idx) => {
                    const [v, t] = progress;
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => open(a, caught, earnedAt, progress)}
                          aria-label={`${a.species}, ${caught ? 'caught' : `not caught, ${v} of ${t}`}. ${a.description}`}
                          className={`press w-full h-full flex flex-col items-center gap-1 p-2 pt-3 border-2 ${
                            caught ? `${TIER_STYLE[a.tier].ring} bg-surface shadow-[3px_4px_0_0_var(--line)]` : 'border-dashed border-ink/25 bg-ink/[0.03]'
                          }`}
                          style={{ borderRadius: `${14 + (idx % 4)}px ${20 - (idx % 3)}px ${16 + (idx % 5)}px ${18 - (idx % 2)}px` }}
                        >
                          <span className="relative">
                            <Species spec={a.spec} silhouette={!caught} className="w-14 sm:w-16" />
                            {!caught && <LockSvg className="absolute -bottom-1 -right-2 w-4 h-4 text-ink-2" />}
                          </span>
                          <span className={`font-display font-bold text-[13px] leading-tight text-center ${caught ? 'text-ink' : 'text-ink-2'}`}>
                            {a.species}
                          </span>
                          {caught ? (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-2">{TIER_STYLE[a.tier].label}</span>
                          ) : (
                            <span className="w-full h-1.5 rounded-full bg-ink/10 overflow-hidden" aria-hidden="true">
                              <span className="block h-full bg-accent rounded-full" style={{ width: `${(v / t) * 100}%` }} />
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {filter !== 'missing' && (
            <section aria-labelledby="keepsakes" className="mb-4">
              <h2 id="keepsakes" className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-extrabold uppercase tracking-widest text-ink-2">Keepsakes</span>
                <span className="text-xs font-extrabold text-ink-2 tabular">{data.keepsakes.length}</span>
              </h2>
              <p className="text-sm font-bold text-ink-2 mb-3">One of a kind: every daily puzzle and co-op clear leaves its own butterfly.</p>
              {data.keepsakes.length === 0 ? (
                <p className="p-4 text-center font-bold text-ink-2 border-2 border-dashed border-ink/20 rounded-2xl">
                  Play today&rsquo;s daily puzzle for your first stamp.
                </p>
              ) : (
                <ul className="grid grid-cols-5 gap-2">
                  {data.keepsakes.map(k => (
                    <li key={k.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelected({
                            title: k.title,
                            species: `${k.title} · ${k.date}`,
                            spec: k.spec,
                            description: k.title === 'Daily stamp' ? `Earned by finishing the daily puzzle of ${k.date}.` : 'Earned by clearing a board together.',
                            caught: true,
                            earnedAt: k.earnedAt,
                          })
                        }
                        aria-label={`${k.title}, ${k.date}`}
                        className="press w-full aspect-square flex items-center justify-center rounded-2xl border-2 border-line bg-tile shadow-[2px_3px_0_0_var(--line)]"
                      >
                        <Species spec={k.spec} className="w-10" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected?.species}>
        {selected && (
          <div className="flex flex-col items-center text-center gap-3 pb-2">
            <Species spec={selected.spec} silhouette={!selected.caught} className={`w-32 mb-1 ${selected.caught ? 'idle-float' : ''}`} />
            <p className="font-display font-bold text-xl text-ink">{selected.title}</p>
            <p className="font-body font-bold text-ink-2">{selected.description}</p>
            {selected.caught ? (
              <p className="text-sm font-extrabold text-ink-2">
                {selected.earnedAt ? `Caught ${new Date(selected.earnedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}` : 'Caught'}
                {selected.tier ? ` · ${TIER_STYLE[selected.tier].label}` : ''}
              </p>
            ) : (
              selected.progress && (
                <div className="w-full flex flex-col gap-2">
                  <div className="nera-track !p-0 h-3" role="progressbar" aria-valuemin={0} aria-valuemax={selected.progress[1]} aria-valuenow={selected.progress[0]} aria-label="Progress">
                    <div className="nera-fill" style={{ width: `${Math.max(3, (selected.progress[0] / selected.progress[1]) * 100)}%` }} />
                  </div>
                  <p className="text-sm font-extrabold text-ink tabular">
                    {selected.progress[0].toLocaleString()} / {selected.progress[1].toLocaleString()}
                  </p>
                  <p className="flex items-center justify-center gap-1 text-sm font-bold text-ink-2">
                    Reward: <TokenSvg className="w-4 h-4" /> {ACHIEVEMENT_BONUS} tokens
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
