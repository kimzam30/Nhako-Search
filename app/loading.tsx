import { DoodleButterfly } from '@/components/ui/Doodles';

/*
 * The NeraOS boot screen, doodle edition: a flapping butterfly over the
 * striped boot bar, marching in steps. Shown only while a route's code loads.
 */
export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 min-h-[60dvh]" role="status" aria-label="Loading">
      <span className="sky-fly !static">
        <DoodleButterfly className="w-16" />
      </span>
      <div className="nera-track w-full max-w-[220px]">
        <div className="nera-fill nera-march" style={{ width: '100%' }} />
      </div>
      <p className="font-accent text-2xl text-ink-2 -rotate-2">opening the journal…</p>
    </div>
  );
}
