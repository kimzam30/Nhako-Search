/**
 * Route-level loading shells.
 *
 * Every page is a client component that fetches in an effect, so navigation
 * previously showed a bare "Loading..." string (or nothing) while the chunk
 * downloaded. These render instantly from the server as a Suspense fallback.
 */

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-ink/10 rounded-xl ${className}`} />;
}

export function PageSkeleton({ title }: { title?: string }) {
  return (
    <div
      className="flex flex-col flex-1 p-6 w-full max-w-lg mx-auto gap-6 pb-32"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading{title ? ` ${title}` : ''}…</span>
      <div className="flex justify-between items-center w-full">
        <SkeletonBlock className="h-9 w-40" />
        <SkeletonBlock className="h-12 w-12 !rounded-full" />
      </div>
      <SkeletonBlock className="h-40 w-full" />
      <SkeletonBlock className="h-32 w-full" />
      <div className="flex gap-4 w-full">
        <SkeletonBlock className="h-28 flex-1" />
        <SkeletonBlock className="h-28 flex-1" />
      </div>
    </div>
  );
}
