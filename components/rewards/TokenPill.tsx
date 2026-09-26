'use client';

import { useEffect, useRef, useState } from 'react';
import { TokenSvg } from '@/components/ui/Icons';

/*
 * The token balance as a HUD pill. When the balance changes it counts to the
 * new value and the coin bumps, so an earn or a spend is felt, not just read.
 */
export function TokenPill({ tokens, className = '' }: { tokens: number | undefined; className?: string }) {
  // `tween` is the in-flight count-up; null means "show the real balance".
  const [tween, setTween] = useState<number | null>(null);
  const [bump, setBump] = useState(0);
  const from = useRef<number | undefined>(tokens);

  useEffect(() => {
    if (tokens === undefined) return;
    const start = from.current;
    from.current = tokens;
    if (start === undefined || start === tokens) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t0 = performance.now();
    let first = true;
    let raf = requestAnimationFrame(function step(now) {
      if (first) {
        first = false;
        setBump(b => b + 1);
      }
      const p = Math.min(1, (now - t0) / 450);
      setTween(p < 1 ? Math.round(start + (tokens - start) * (1 - Math.pow(1 - p, 3))) : null);
      if (p < 1) raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [tokens]);

  return (
    <span className={`hud-pill text-sm ${className}`} aria-label={`${tokens ?? 0} butterfly tokens`}>
      <TokenSvg key={bump} className={`w-5 h-5 ${bump ? 'token-bump' : ''}`} />
      <span className="tabular">{tween ?? tokens ?? 0}</span>
    </span>
  );
}
