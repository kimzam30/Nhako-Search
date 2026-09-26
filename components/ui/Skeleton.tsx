/**
 * Loading shells, shaped like the screens they stand in for.
 *
 * Shown only while a route's code or a player's very first data is loading;
 * after that the cached summary paints straight away. Each one matches its
 * final layout (same widths, same blocks), so nothing jumps when the real
 * content arrives. The shimmer is `.skeleton` in globals.css and stops under
 * reduced motion.
 */

export function SkeletonBlock({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton rounded-xl ${className}`} style={style} aria-hidden="true" />;
}

function Status({ label }: { label: string }) {
  return <span className="sr-only">Loading {label}…</span>;
}

/** Title + hero + cards: the lobby screens (daily, profile, settings). */
export function PageSkeleton({ title }: { title?: string }) {
  return (
    <div
      className="flex flex-col flex-1 px-4 w-full max-w-lg mx-auto gap-4 pb-8"
      style={{ paddingTop: 'max(1rem, var(--safe-top))' }}
      role="status"
      aria-busy="true"
    >
      <Status label={title ?? 'page'} />
      <div className="flex justify-between items-end w-full">
        <div className="flex flex-col gap-2">
          <SkeletonBlock className="h-9 w-44" />
          <SkeletonBlock className="h-6 w-32" />
        </div>
        <SkeletonBlock className="h-9 w-20 !rounded-full" />
      </div>
      <SkeletonBlock className="h-44 w-full !rounded-[24px]" />
      <SkeletonBlock className="h-24 w-full !rounded-[20px]" />
      <div className="grid grid-cols-2 gap-3 w-full">
        <SkeletonBlock className="h-20 !rounded-[18px]" />
        <SkeletonBlock className="h-20 !rounded-[18px]" />
      </div>
    </div>
  );
}

/** A game screen: garland, square board, word chips, booster bar. */
export function BoardSkeleton() {
  return (
    <div className="flex flex-col flex-1 items-center w-full max-w-lg mx-auto px-3 pt-1 pb-3 gap-3" role="status" aria-busy="true">
      <Status label="puzzle" />
      <SkeletonBlock className="h-10 w-4/5 !rounded-full" />
      <SkeletonBlock className="grid-board aspect-square !rounded-[22px] mt-auto" />
      <div className="flex flex-wrap justify-center gap-2 w-full">
        {[64, 88, 72, 96, 60, 80].map((w, i) => (
          <SkeletonBlock key={i} className="h-8 !rounded-full" style={{ width: w }} />
        ))}
      </div>
      <div className="flex justify-between w-full mt-auto">
        <SkeletonBlock className="h-10 w-24 !rounded-full" />
        <SkeletonBlock className="h-14 w-28 !rounded-[16px]" />
      </div>
    </div>
  );
}

/** Rows of people or items (friends, leaderboard). */
export function ListSkeleton({ rows = 5, label = 'list' }: { rows?: number; label?: string }) {
  return (
    <div className="flex flex-col gap-2.5" role="status" aria-busy="true">
      <Status label={label} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-[18px] border-2 border-ink/10">
          <SkeletonBlock className="w-11 h-11 !rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <SkeletonBlock className="h-4 w-1/2" />
            <SkeletonBlock className="h-3 w-1/3" />
          </div>
          <SkeletonBlock className="h-7 w-12 !rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** The album grid. */
export function GridSkeleton({ cells = 12 }: { cells?: number }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3" role="status" aria-busy="true">
      <Status label="album" />
      {Array.from({ length: cells }).map((_, i) => (
        <SkeletonBlock key={i} className="aspect-[4/5] !rounded-[18px]" />
      ))}
    </div>
  );
}
