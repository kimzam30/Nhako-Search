'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { DoodleButterfly } from '@/components/ui/Doodles';

/*
 * Route-level error boundary. Something threw while rendering a screen: keep
 * the app shell (tab bar, sound) alive, say so plainly, and offer a retry
 * that re-renders just this screen. Progress is saved as it happens, so
 * nothing already won is lost.
 */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[route error]', error);
  }, [error]);

  return (
    <div role="alert" className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-16 text-center min-h-[70dvh]">
      <DoodleButterfly className="w-20 -rotate-12" wing="var(--word-6)" wing2="var(--word-4)" />
      <h1 className="font-display font-bold text-3xl text-ink">Something went wrong</h1>
      <p className="max-w-xs font-bold text-ink-2">
        This screen hit a snag. Your progress is saved — try again, or head home.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          type="button"
          onClick={reset}
          className="press flex items-center justify-center min-h-[52px] px-6 border-2 border-line bg-accent text-on-accent font-display font-bold text-lg shadow-[4px_5px_0_0_var(--line)] rounded-tl-[18px] rounded-tr-[12px] rounded-br-[16px] rounded-bl-[10px]"
        >
          Try again
        </button>
        <Link href="/" className="min-h-[44px] flex items-center justify-center font-extrabold text-ink-2 underline decoration-2">
          Back to home
        </Link>
      </div>
      {error.digest && <p className="text-xs font-bold text-ink-2/70 tabular">ref {error.digest}</p>}
    </div>
  );
}
