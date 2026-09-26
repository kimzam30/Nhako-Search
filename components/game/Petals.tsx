'use client';

import { useMemo } from 'react';

/** Deterministic 0..1 per (petal, channel): render stays pure, the fall still looks random. */
function rnd(i: number, k: number) {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * The NeraOS finale: a capped fall of petals (design.md §6 caps particles).
 * Pure CSS once rendered; hidden entirely under reduced motion (.petals).
 */
export function Petals({ count = 36 }: { count?: number }) {
  const petals = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: rnd(i, 1) * 100,
        delay: rnd(i, 2) * 0.9,
        duration: 2.4 + rnd(i, 3) * 2.2,
        drift: (rnd(i, 4) - 0.5) * 140,
        scale: 0.7 + rnd(i, 5) * 0.8,
        key: i,
      })),
    [count]
  );
  return (
    <div className="petals" aria-hidden="true">
      {petals.map(p => (
        <span
          key={p.key}
          className="petal"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            scale: String(p.scale),
            ['--drift' as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
