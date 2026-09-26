/*
 * Illustration set for the game-feel pass (docs/game-feel.md).
 *
 * Same hand as Icons.tsx: a ~2px inked stroke with slightly uneven paths, but
 * FILLED with the pastel tokens, so they read as stickers rather than UI
 * glyphs. Every colour is a CSS variable, so both themes work unchanged.
 * All decorative: aria-hidden throughout.
 */

type ArtProps = { className?: string };

/** The filled doodle butterfly: sky flock, garland slots, mascot. */
export function DoodleButterfly({
  className = '',
  wing = 'var(--word-1)',
  wing2 = 'var(--lav)',
  stroke = 'var(--line)',
}: ArtProps & { wing?: string; wing2?: string; stroke?: string }) {
  return (
    <svg viewBox="0 0 48 40" className={className} aria-hidden="true" focusable="false">
      <g stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        {/* upper wings */}
        <path d="M23 19C19 9 11 3.5 5.5 5.2C1.2 6.6 2 13.5 6.8 17.3C10.5 20.2 16.8 21 23 19Z" fill={wing} />
        <path d="M25 19C29 9 37 3.5 42.5 5.2C46.8 6.6 46 13.5 41.2 17.3C37.5 20.2 31.2 21 25 19Z" fill={wing} />
        {/* lower wings */}
        <path d="M23 20.5C17.5 21.5 10.8 24.8 10.2 30.2C9.8 34.2 14 36 17.6 33.6C21 31.3 22.6 25.8 23 20.5Z" fill={wing2} />
        <path d="M25 20.5C30.5 21.5 37.2 24.8 37.8 30.2C38.2 34.2 34 36 30.4 33.6C27 31.3 25.4 25.8 25 20.5Z" fill={wing2} />
        {/* body + antennae */}
        <path d="M24 12.5C22.6 16 22.6 25 24 30.5C25.4 25 25.4 16 24 12.5Z" fill={stroke} />
        <path d="M23.4 12.8C22 9 19.8 6.8 17.8 6.2" fill="none" />
        <path d="M24.6 12.8C26 9 28.2 6.8 30.2 6.2" fill="none" />
      </g>
      {/* wing spots */}
      <circle cx="10" cy="11" r="2" fill="var(--art-light)" opacity="0.85" />
      <circle cx="38" cy="11" r="2" fill="var(--art-light)" opacity="0.85" />
      <circle cx="15.5" cy="29.5" r="1.4" fill="var(--art-light)" opacity="0.85" />
      <circle cx="32.5" cy="29.5" r="1.4" fill="var(--art-light)" opacity="0.85" />
    </svg>
  );
}

/** Garden: a tall daisy with a leaf. */
export function GardenArt({ className = '' }: ArtProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <g stroke="var(--line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 36C31.5 44 32.5 52 32 60" fill="none" />
        <path d="M32 50C27 45 20 45.5 17 48.5C21 53 28 53 32 50Z" fill="var(--word-3)" />
        {[0, 60, 120, 180, 240, 300].map(a => (
          <ellipse key={a} cx="32" cy="17" rx="6.5" ry="10" fill="var(--art-light)" transform={`rotate(${a} 32 25)`} />
        ))}
        <circle cx="32" cy="25" r="6.5" fill="var(--word-4)" />
      </g>
    </svg>
  );
}

/** Rainy day: a cloud dripping. */
export function RainyArt({ className = '' }: ArtProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <g stroke="var(--line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M17 38C9.5 38 7.5 29.5 13.5 26.5C13 18.5 22 14 28 19C31 11 44.5 11.5 46 21C54 21 56.5 30 51 35C49.5 37 47.5 38 45 38Z"
          fill="var(--word-5)"
        />
        <path d="M22 44C21 47 20 49 20.5 51.5C21 53.5 24 53.5 24.3 51.3C24.6 49 23 46.5 22 44Z" fill="var(--word-5)" />
        <path d="M34 46C33 49 32 51 32.5 53.5C33 55.5 36 55.5 36.3 53.3C36.6 51 35 48.5 34 46Z" fill="var(--word-5)" />
        <path d="M45 43C44 46 43 48 43.5 50.5C44 52.5 47 52.5 47.3 50.3C47.6 48 46 45.5 45 43Z" fill="var(--word-5)" />
      </g>
    </svg>
  );
}

/** Cozy cottage: a steaming mug. */
export function CottageArt({ className = '' }: ArtProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <g stroke="var(--line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 10C21 14 27 16 24 20M32 8C29 12 35 14 32 18M40 10C37 14 43 16 40 20" fill="none" />
        <path d="M44 32C51 31 53 38 49.5 42C47.5 44.3 44.5 44.5 42.5 44" fill="none" />
        <path d="M15 26H46.5C46.5 26 47.5 42 42 49C38.5 53.5 23 53.5 19.5 49C14 42 15 26 15 26Z" fill="var(--word-6)" />
        <path d="M22 38C24.5 35 27.5 35 30.5 38C33.5 41 36.5 41 39 38" fill="none" />
        <path d="M10 55C20 57.5 42 57.5 52 55" fill="none" />
      </g>
    </svg>
  );
}

/** Night sky: a crescent moon with two stars. */
export function NightArt({ className = '' }: ArtProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <g stroke="var(--line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M38 10C27 10.5 18 20 18.5 32C19 44 29.5 53.5 41.5 52.5C46 52 49.5 50.5 52 48C38.5 48.5 30.5 39 31 28.5C31.4 20 35.5 13.5 38 10Z"
          fill="var(--word-4)"
        />
        <path d="M48 14L49.6 18.6L54 20L49.6 21.4L48 26L46.4 21.4L42 20L46.4 18.6Z" fill="var(--lav)" />
        <path d="M13 44L14 47L17 48L14 49L13 52L12 49L9 48L12 47Z" fill="var(--lav)" />
      </g>
    </svg>
  );
}

/** Date night: two hearts overlapping. */
export function DateArt({ className = '' }: ArtProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <g stroke="var(--line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M40 52C33 46.5 24 40 24.5 31C25 25 32 22.5 36 28C40 22.5 47.5 24.5 48 31C48.5 39 44 46 40 52Z"
          fill="var(--lav)"
        />
        <path
          d="M26 48C17 41.5 8 34 9 24C9.7 17 18.5 14.5 23.5 21.5C28 14.5 37.5 16.5 38 24.5C38.6 33.5 32 41 26 48Z"
          fill="var(--word-1)"
        />
      </g>
    </svg>
  );
}

/** Mixed pack: three letter tiles, stacked. */
export function MixedArt({ className = '' }: ArtProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <g stroke="var(--line)" strokeWidth="2" strokeLinejoin="round">
        <rect x="8" y="30" width="22" height="22" rx="5" fill="var(--word-2)" transform="rotate(-8 19 41)" />
        <rect x="34" y="30" width="22" height="22" rx="5" fill="var(--word-3)" transform="rotate(6 45 41)" />
        <rect x="21" y="8" width="22" height="22" rx="5" fill="var(--word-1)" transform="rotate(-3 32 19)" />
      </g>
      <g fill="var(--line)" fontFamily="var(--font-fredoka), sans-serif" fontWeight="700" fontSize="14" textAnchor="middle">
        <text x="19" y="46" transform="rotate(-8 19 41)">A</text>
        <text x="45" y="46" transform="rotate(6 45 41)">Z</text>
        <text x="32" y="24" transform="rotate(-3 32 19)">N</text>
      </g>
    </svg>
  );
}

export const THEME_ART: Record<string, (p: ArtProps) => React.JSX.Element> = {
  standard: MixedArt,
  garden: GardenArt,
  'rainy-day': RainyArt,
  'cozy-cottage': CottageArt,
  'night-sky': NightArt,
  'date-night': DateArt,
};

/** Chapter name -> its theme art, for the level path and home stage. */
export function ChapterArt({ chapter, className = '' }: ArtProps & { chapter: string }) {
  const c = chapter.toLowerCase();
  if (c.startsWith('garden')) return <GardenArt className={className} />;
  if (c.startsWith('rainy')) return <RainyArt className={className} />;
  if (c.startsWith('cozy')) return <CottageArt className={className} />;
  if (c.startsWith('night')) return <NightArt className={className} />;
  if (c.startsWith('date')) return <DateArt className={className} />;
  return <MixedArt className={className} />;
}

/**
 * The home screen stage: rolling hills and a dotted path winding to a
 * flag. Stretches to fill its box (preserveAspectRatio none on the hills only
 * would distort the doodles, so the scene is laid out on a wide 360x200 canvas
 * and sliced to cover).
 */
export function StageScene({ className = '' }: ArtProps) {
  return (
    <svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true" focusable="false">
      <g stroke="var(--line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* far hill */}
        <path d="M-10 132C40 96 96 100 140 118C190 138 236 92 290 98C322 102 346 116 372 126V210H-10Z" fill="var(--lav-soft)" />
        {/* near hill */}
        <path d="M-10 158C44 140 92 150 146 160C206 171 262 140 318 146C340 148 356 154 372 160V210H-10Z" fill="var(--word-3)" opacity="0.55" />
      </g>
      {/* dotted path to the flag */}
      <path
        d="M48 196C70 176 110 176 128 164C150 150 176 150 204 146C226 142 238 128 250 116"
        fill="none"
        stroke="var(--line)"
        strokeWidth="2.5"
        strokeDasharray="1 9"
        strokeLinecap="round"
        opacity="0.55"
      />
      <g stroke="var(--line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M252 116V82" fill="none" />
        <path d="M252 83C258 80 264 86 272 83V96C264 99 258 93 252 96Z" fill="var(--accent)" />
        {/* tufts and flowers */}
        <path d="M30 170C32 164 34 164 36 170M36 170C38 162 40 162 42 170" fill="none" />
        <path d="M322 176C324 170 326 170 328 176M328 176C330 168 332 168 334 176" fill="none" />
        <circle cx="96" cy="176" r="4" fill="var(--word-1)" />
        <circle cx="178" cy="182" r="4" fill="var(--word-4)" />
        <circle cx="290" cy="170" r="4" fill="var(--word-2)" />
      </g>
    </svg>
  );
}
