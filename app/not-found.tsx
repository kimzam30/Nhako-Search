import Link from 'next/link';
import { DoodleButterfly } from '@/components/ui/Doodles';

/*
 * 404: an unknown address (a typo, an old link, a level id that does not
 * exist). Friendly, on-brand, with a way home — the default Next page was a
 * bare black-and-white "404" with no navigation.
 */
export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-16 text-center min-h-[70dvh]">
      <span className="idle-float">
        <DoodleButterfly className="w-24" wing="var(--word-5)" wing2="var(--word-2)" />
      </span>
      <p className="font-accent text-3xl text-ink-2 -rotate-2">this page flew away</p>
      <h1 className="font-display font-bold text-4xl text-ink">Page not found</h1>
      <p className="max-w-xs font-bold text-ink-2">The link may be old or mistyped. Everything else is right where you left it.</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/"
          className="sticker flex items-center justify-center min-h-[52px] px-6 border-2 border-line bg-accent text-on-accent font-display font-bold text-lg rounded-tl-[18px] rounded-tr-[12px] rounded-br-[16px] rounded-bl-[10px]"
        >
          Back to home
        </Link>
        <Link href="/level-path" className="min-h-[44px] flex items-center justify-center font-extrabold text-ink-2 underline decoration-2">
          Open the level map
        </Link>
      </div>
    </div>
  );
}
