'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DoodleButterfly } from '@/components/ui/Doodles';
import { isGameplayRoute } from '@/lib/nav/routes';

/*
 * The butterfly sky, ported from NeraOS's `startButterflies` via Nhako Tools'
 * ButterflySky: a random walk on the heading, a sine bob, wrap-around at the
 * edges, the body turned to face the way it flies, each wing on its own flap
 * period. Drawn as our doodle butterfly, not a pixel sprite.
 *
 * It lives in the root layout so the flock carries over between routes
 * instead of re-scattering on every navigation.
 *
 * It never interrupts play (docs/game-feel.md §3):
 *  - it is painted BEHIND every page (.sky, z-index -1) with no pointer events;
 *  - on gameplay routes the flock thins to 3 and fades to 35%;
 *  - any element marked [data-no-fly] (the board, the word tray) is a no-fly
 *    zone: a butterfly that drifts toward one is turned back out of it.
 */

const MAX = 7;
const PALETTE: [string, string][] = [
  ['var(--word-1)', 'var(--lav)'],
  ['var(--word-2)', 'var(--word-1)'],
  ['var(--word-4)', 'var(--word-6)'],
  ['var(--word-5)', 'var(--word-2)'],
  ['var(--word-3)', 'var(--word-4)'],
  ['var(--word-7)', 'var(--word-5)'],
  ['var(--word-6)', 'var(--word-1)'],
];

interface Fly {
  x: number;
  y: number;
  a: number;
  v: number;
  phase: number;
  size: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function ButterflySky() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const modeRef = useRef({ count: MAX, opacity: 0.8 });

  // Client-only: positions are random and motion preference is a media query.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setEnabled(!mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const gameplay = isGameplayRoute(pathname);
    const phone = window.innerWidth < 640;
    modeRef.current = gameplay
      ? { count: 3, opacity: 0.35 }
      : { count: phone ? 5 : MAX, opacity: 0.6 };
    els.current.forEach((el, i) => {
      if (!el) return;
      el.style.display = i < modeRef.current.count ? '' : 'none';
      el.style.opacity = String(modeRef.current.opacity);
    });
  }, [pathname, enabled]);

  useEffect(() => {
    if (!enabled) return;
    let W = window.innerWidth;
    let H = window.innerHeight;
    const flies: Fly[] = Array.from({ length: MAX }, () => ({
      x: rand(0, W),
      y: rand(0, H),
      a: rand(0, Math.PI * 2),
      v: rand(0.35, 0.7),
      phase: rand(0, 10),
      size: Math.round(rand(26, 40)),
    }));
    els.current.forEach((el, i) => {
      if (el) el.style.width = `${flies[i].size}px`;
    });

    // No-fly zones are re-measured a few times a second, not every frame:
    // getBoundingClientRect on every frame would force layout 60 times a second.
    let zones: DOMRect[] = [];
    const measure = () => {
      zones = Array.from(document.querySelectorAll('[data-no-fly]')).map(el => el.getBoundingClientRect());
    };
    measure();
    const measureId = window.setInterval(measure, 400);

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      measure();
    };
    window.addEventListener('resize', onResize);

    let raf = 0;
    const tick = (t: number) => {
      const { count } = modeRef.current;
      for (let i = 0; i < count; i++) {
        const f = flies[i];
        const el = els.current[i];
        if (!el) continue;
        f.a += (Math.random() - 0.5) * 0.12;

        // Steer out of any no-fly zone (with a margin), toward its nearest edge.
        for (const z of zones) {
          const m = 28;
          if (f.x > z.left - m && f.x < z.right + m && f.y > z.top - m && f.y < z.bottom + m) {
            const cx = (z.left + z.right) / 2;
            const cy = (z.top + z.bottom) / 2;
            const away = Math.atan2(f.y - cy, f.x - cx);
            // Turn toward "away" smoothly and push a little so it cannot stall.
            f.a += Math.atan2(Math.sin(away - f.a), Math.cos(away - f.a)) * 0.15;
            f.x += Math.cos(away) * 1.2;
            f.y += Math.sin(away) * 1.2;
          }
        }

        f.x += Math.cos(f.a) * f.v;
        f.y += Math.sin(f.a) * f.v + Math.sin(t * 0.004 + f.phase) * 0.35;
        if (f.x < -60) f.x = W + 40;
        if (f.x > W + 60) f.x = -40;
        if (f.y < -60) f.y = H + 40;
        if (f.y > H + 60) f.y = -40;
        const deg = (f.a * 180) / Math.PI + 90;
        el.style.transform = `translate3d(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px, 0) rotate(${deg.toFixed(1)}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(measureId);
      window.removeEventListener('resize', onResize);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="sky" aria-hidden="true">
      {PALETTE.map(([wing, wing2], i) => (
        <div
          key={i}
          ref={el => {
            els.current[i] = el;
          }}
          className="sky-fly"
          style={{ ['--flap' as string]: `${(0.3 + (i % 4) * 0.08).toFixed(2)}s`, opacity: 0, width: 32 }}
        >
          <DoodleButterfly wing={wing} wing2={wing2} className="w-full h-auto" />
        </div>
      ))}
    </div>
  );
}
