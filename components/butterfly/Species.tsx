import { useId } from 'react';
import type { SpeciesSpec, WingShape } from '@/lib/rewards/species';

/*
 * Draws a butterfly species (lib/rewards/species.ts) in the doodle hand:
 * inked 2px outline, filled wings, pattern clipped inside the wings.
 * Only the left half is authored; the right is its mirror, so every species
 * is symmetrical the way real ones are.
 */

const UPPER: Record<WingShape, string> = {
  0: 'M23 19C19 9 11 3.5 5.5 5.2C1.2 6.6 2 13.5 6.8 17.3C10.5 20.2 16.8 21 23 19Z',
  1: 'M23 18C18 10 9 3 2 3C3 9 6 15 10 18C14 20 19 20 23 18Z',
  2: 'M23 18C20 11 13 6 7 7C2.5 8 1.5 14 4 18C7 21.5 16 21.5 23 18Z',
  3: 'M23 18C18 13 10 8 3.5 8.5C1 9 1.5 12 4 13.5C9 16.5 16 19 23 18Z',
  4: 'M23 19C20 10 13 4 7 4.5C5 5.5 3.5 4.5 2.5 7C1.5 9.5 3.5 10.5 3 12.5C2.5 15 5 17 7.5 18C12 20.5 18 20.5 23 19Z',
  5: 'M23 18.5C20.5 11 15 5.5 9.5 5.5C5 5.5 3 9.5 5 13.5C7.5 18 15 20 23 18.5Z',
};

const LOWER: Record<WingShape, string> = {
  0: 'M23 20.5C17.5 21.5 10.8 24.8 10.2 30.2C9.8 34.2 14 36 17.6 33.6C21 31.3 22.6 25.8 23 20.5Z',
  1: 'M23 20C18 21 12 24 11 29C10.5 32 12 34 14 34C19 33 22 27 23 20Z',
  2: 'M23 20C17 20 9 23 7.5 28C6.5 32 10 36 15 34.5C20 33 22.5 26 23 20Z',
  3: 'M23 20C19 21 14 24 13 28.5C12.5 31.5 15 33 17.5 31.5C20.5 29.5 22.5 25 23 20Z',
  4: 'M23 20.5C18 21 12 24 10.5 28C9 30 10.5 31.5 10 33.5C11 35.5 13 34.5 14.5 35.5C17 35 18.5 33.5 19.5 31.5C21.5 28 22.7 24.5 23 20.5Z',
  5: 'M23 20C16 19 8 21 6 26.5C4.5 31 8.5 35 13 33C15 36 19.5 35.5 21 31.5C22.5 28 23 24 23 20Z',
};

/** Swallowtail streamer hanging off the hindwing. */
const TAIL: Record<WingShape, string> = {
  0: 'M13.5 34C12.8 36 12.3 38 12.8 39.2C13.8 39.4 14.8 37.4 15.6 34.6',
  1: 'M13 33.8C12 36 11.3 38.5 12 39.5C13.2 39.6 14.6 37 15.6 34',
  2: 'M11 34.5C10 36.5 9.5 38.5 10.2 39.4C11.4 39.5 12.6 37.4 13.4 35',
  3: 'M15.5 32C14.8 34.5 14.4 37 15 38.4C16 38.5 17 36 17.6 32',
  4: 'M12.5 35C11.6 37 11.2 38.8 11.8 39.6C12.9 39.6 13.9 37.6 14.6 35.4',
  5: 'M10 33.4C9 35.5 8.6 37.6 9.3 38.6C10.5 38.6 11.6 36.6 12.3 34',
};

function Pattern({ spec }: { spec: SpeciesSpec }) {
  const accent = spec.colors[2];
  switch (spec.pattern) {
    case 'spots':
      return (
        <g fill={accent} opacity="0.9">
          <circle cx="10" cy="11" r="2.2" />
          <circle cx="15" cy="15" r="1.3" />
          <circle cx="15.5" cy="29" r="1.6" />
        </g>
      );
    case 'eyes':
      return (
        <g>
          <circle cx="10.5" cy="11.5" r="3.4" fill={accent} />
          <circle cx="10.5" cy="11.5" r="1.8" fill="var(--line)" />
          <circle cx="10" cy="11" r="0.6" fill="var(--art-light)" />
          <circle cx="15.5" cy="29" r="2.4" fill={accent} />
          <circle cx="15.5" cy="29" r="1.1" fill="var(--line)" />
        </g>
      );
    case 'bands':
      return (
        <g fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" opacity="0.9">
          <path d="M3 13C9 11 15 12.5 22 16.5" />
          <path d="M9 30C13 27.5 17.5 26 22.5 25" />
        </g>
      );
    case 'veins':
      return (
        <g fill="none" stroke={accent} strokeWidth="0.9" strokeLinecap="round" opacity="0.85">
          <path d="M23 18.5L5 8M23 18.5L3 13M23 18.5L7 17.5M23 18.5L12 5.5" />
          <path d="M23 21L11 29M23 21L14.5 33.5M23 21L19 33" />
        </g>
      );
    case 'dots':
      return (
        <g fill={accent}>
          {[[4, 8], [3, 12], [5, 16], [8, 5.5], [12, 5], [10, 31], [12, 34], [16, 34.5], [9, 27]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1" />
          ))}
        </g>
      );
    case 'marble':
      return (
        <g fill={accent} opacity="0.55">
          <ellipse cx="12" cy="12" rx="6" ry="3.2" transform="rotate(-20 12 12)" />
          <ellipse cx="16" cy="28" rx="4.5" ry="2.4" transform="rotate(35 16 28)" />
          <ellipse cx="7" cy="16" rx="2.4" ry="1.4" />
        </g>
      );
    case 'stripes':
      return (
        <g fill="none" stroke={accent} strokeWidth="1.6" opacity="0.85">
          {[0, 4, 8, 12, 16].map(o => (
            <path key={o} d={`M${2 + o} 2L${10 + o} 22`} />
          ))}
          {[0, 4, 8].map(o => (
            <path key={`l${o}`} d={`M${8 + o} 22L${14 + o} 38`} />
          ))}
        </g>
      );
    case 'tips':
      return (
        <g fill={accent}>
          <circle cx="4" cy="7" r="6" />
          <circle cx="9" cy="33.5" r="4.5" />
        </g>
      );
    default:
      return null;
  }
}

function Antennae({ spec }: { spec: SpeciesSpec }) {
  const kind = spec.antenna ?? 'club';
  return (
    <g fill="none" stroke="var(--line)" strokeWidth="1.6" strokeLinecap="round">
      <path d="M23.4 12.8C22 9 19.8 6.8 17.8 6.2" />
      {kind === 'club' && <circle cx="17.6" cy="6.1" r="1.3" fill="var(--line)" stroke="none" />}
      {kind === 'curl' && <path d="M17.8 6.2C16.3 5.8 16 7.6 17.3 7.6" />}
      {kind === 'feather' && <path d="M21.5 9.8L20 9.4M20.3 8.4L18.9 8.2M19.1 7.3L18 7.4" />}
    </g>
  );
}

export function Species({
  spec,
  className = '',
  silhouette = false,
  title,
}: {
  spec: SpeciesSpec;
  className?: string;
  /** Locked: ink outline only, no colour. */
  silhouette?: boolean;
  title?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const [upper, lower] = spec.colors;
  const fillU = silhouette ? 'transparent' : upper;
  const fillL = silhouette ? 'transparent' : lower;
  const stroke = silhouette ? 'var(--ink-2)' : 'var(--line)';
  const half = (
    <>
      {spec.tail && <path d={TAIL[spec.shape]} fill={fillL} stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />}
      <path d={UPPER[spec.shape]} fill={fillU} />
      <path d={LOWER[spec.shape]} fill={fillL} />
      {!silhouette && (
        <g clipPath={`url(#w-${uid})`}>
          <Pattern spec={spec} />
        </g>
      )}
      <path d={UPPER[spec.shape]} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      <path d={LOWER[spec.shape]} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      {!silhouette && <Antennae spec={spec} />}
    </>
  );
  return (
    <svg
      viewBox="0 0 48 41"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      opacity={silhouette ? 0.45 : 1}
    >
      <defs>
        <clipPath id={`w-${uid}`}>
          <path d={UPPER[spec.shape]} />
          <path d={LOWER[spec.shape]} />
        </clipPath>
      </defs>
      <g>{half}</g>
      <g transform="translate(48 0) scale(-1 1)">{half}</g>
      <path d="M24 12.5C22.6 16 22.6 25 24 30.5C25.4 25 25.4 16 24 12.5Z" fill={stroke} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
