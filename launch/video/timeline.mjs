/**
 * The launch video's single source of timing. The picture (scene.js) and the
 * soundtrack (audio.mjs) both read this file, so a cut you see and the sound
 * you hear cannot drift apart.
 *
 * Vertical, for TikTok / Reels / Shorts: 1080x1920, 30 fps, 60 s. The music
 * runs at 120 BPM, so a bar is 2 s and every scene starts on a beat.
 *
 * Story: what it is, how you play, then the long middle on multiplayer, a
 * quick montage of everything else, then how to install it and that it runs
 * on every device, and the end card.
 */

export const W = 1080;
export const H = 1920;
export const FPS = 30;
export const BPM = 120;
export const DURATION = 60;

/** Opening words, big and alone. The capsule draws round "two" like a find. */
export const INTRO = { words: [0.35, 1.3], capsule: [1.75, 2.35], out: [3.35, 3.95] };

/** The build into multiplayer: one line, then the beat drops. */
export const BRIDGE = { in: 19.6, line2: 20.4, out: [21.2, 21.6] };

/**
 * Captions over the phones: eyebrow, headline, one grey line. Every claim is
 * a real feature shown in the capture under it.
 */
export const CAPTIONS = [
  { t: 4.1, eyebrow: 'NhakoSearch', head: 'The cozy word search.', sub: 'Free, in your browser. Nothing to download.' },
  { t: 8.0, eyebrow: 'How to play', head: 'Drag across a word.', sub: 'Across, down, diagonal, even backwards.' },
  { t: 13.8, eyebrow: 'Hints', head: 'Stuck? Light up a letter.', sub: 'Pay with butterfly tokens you earn by playing.' },
  { t: 16.4, eyebrow: 'Rewards', head: 'Stars, tokens, butterflies.', sub: 'Every achievement is a butterfly for your album.' },
  { t: BRIDGE.in, hide: true },
  { t: 21.6, eyebrow: 'Multiplayer', head: 'Make a room. Share the code.', sub: 'Your friend joins from any phone, tablet or computer.' },
  { t: 25.0, eyebrow: 'Race', head: 'Same board. Who finds it first?', sub: 'Watch each other’s progress live.' },
  { t: 29.5, eyebrow: 'Together', head: 'Or solve it as a team.', sub: 'One shared board, with chat while you search.' },
  { t: 34.0, eyebrow: 'Daily puzzle', head: 'A new board every day.', sub: 'Keep your streak going.' },
  { t: 35.3, eyebrow: 'Level path', head: '360 levels to climb.', sub: 'Twelve chapters, up to three stars each.' },
  { t: 36.6, eyebrow: 'Level path', head: 'Every chapter, its own world.', sub: 'Garden, rainy day, cottage, night sky…' },
  { t: 37.9, eyebrow: 'Free play', head: '12 themes. 3 difficulties.', sub: 'Play as many boards as you like.' },
  { t: 39.2, eyebrow: 'Album', head: '37 butterflies to collect.', sub: 'Each one a hand-designed species.' },
  { t: 40.5, eyebrow: 'Sound', head: 'Lofi and rain, built in.', sub: 'Ambience made live in your browser.' },
  { t: 42.5, eyebrow: 'Dark mode', head: 'Light. Or dark.', sub: 'Meadow Journal by day, Night Garden by night.' },
  { t: 44.5, eyebrow: 'Install', head: 'On your home screen in seconds.', sub: 'No app store. No download. Always free.' },
  { t: 48.5, eyebrow: 'Every device', head: 'Phone. Tablet. Computer.', sub: 'Play together across any of them.' },
  { t: 52.5, end: true },
];

/**
 * What each phone shows. `via`: 'cut' swaps, 'fade' crossfades, 'pop' swaps
 * with a small scale bounce (a find landing).
 */
export const PHONE_SCREENS = [
  { t: 0, shot: 'home', via: 'cut' },
  { t: 8.0, shot: 'board-0', via: 'fade' },
  { t: 9.6, shot: 'board-1', via: 'pop' },
  { t: 11.0, shot: 'board-2', via: 'pop' },
  { t: 12.4, shot: 'board-3', via: 'pop' },
  { t: 13.8, shot: 'board-hint', via: 'pop' },
  { t: 16.4, shot: 'win', via: 'fade' },
  { t: 34.0, shot: 'daily', via: 'cut' },
  { t: 35.3, shot: 'map-garden', via: 'cut' },
  { t: 36.6, shot: 'map-night', via: 'fade' },
  { t: 37.9, shot: 'themes', via: 'cut' },
  { t: 39.2, shot: 'album', via: 'cut' },
  { t: 40.5, shot: 'sound', via: 'cut' },
  { t: 42.5, shot: 'home-dark', via: 'fade' },
];
/** The two phones of the multiplayer section: you (left) and your friend. */
export const DUO_SCREENS = [
  { t: 21.6, you: 'room-leader', friend: 'room-guest' },
  { t: 25.0, you: 'race-leader', friend: 'race-guest' },
  { t: 29.5, you: 'coop-board', friend: 'coop-chat' },
];

/**
 * Where the single phone sits. Keys are eased (cubic in-out). y is the
 * offset of the phone's centre from its home spot, s its scale, r rotation.
 */
export const PHONE_POSES = [
  { t: 3.7, y: 1500, s: 0.9, r: 8 },
  { t: 4.9, y: 0, s: 1, r: 0 },
  { t: 8.0, y: 0, s: 1, r: 0 },
  { t: 19.2, y: 0, s: 1, r: 0 },
  { t: 20.0, y: 1600, s: 0.9, r: -8 },
  { t: 33.3, y: 1600, s: 0.9, r: 8 },
  { t: 34.1, y: 0, s: 1, r: 0 },
  { t: 44.0, y: 0, s: 1, r: 0 },
  { t: 44.6, y: 1600, s: 0.9, r: -6 },
];
/** The duo slides in from the sides on the drop and out before the montage. */
export const DUO = { in: [21.6, 22.4], vs: 25.15, out: [33.2, 33.9] };

/** The install scene: steps, the icon dropping into the home screen. */
export const INSTALL = { in: [44.5, 45.2], steps: [45.2, 45.8, 46.4], drop: 46.9, tapOpen: 47.7, out: [48.2, 48.6] };

/** Every device at once. */
export const DEVICES = { in: [48.5, 49.4], out: [52.0, 52.5] };

/** The backdrop goes to night for the dark-mode beat (the music breaks down). */
export const DARK = { in: [42.3, 42.9], out: [44.3, 44.9] };

/** End card. */
export const END = { icon: 52.6, title: 53.2, tagline: 53.8, url: 54.6, small: 55.3, fadeOut: 59.0 };

/**
 * Every sound effect, derived from the cues above so it cannot drift.
 * audio.mjs turns each kind into a sound.
 */
export function soundCues() {
  const cues = [{ t: 3.6, kind: 'whoosh' }, { t: INTRO.capsule[0], kind: 'found' }, { t: 4.9, kind: 'drop' }];
  for (const s of PHONE_SCREENS) {
    if (s.via === 'pop') cues.push({ t: s.t, kind: s.shot === 'board-hint' ? 'shimmer' : 'found' });
    if (s.via === 'cut' && s.t > 30) cues.push({ t: s.t, kind: 'swish' });
  }
  cues.push({ t: 16.5, kind: 'done' });
  cues.push({ t: 19.7, kind: 'whoosh' });
  cues.push({ t: DUO.in[0], kind: 'impact' });
  cues.push({ t: DUO.vs, kind: 'impact' });
  cues.push({ t: 29.5, kind: 'swish' });
  cues.push({ t: 33.3, kind: 'whoosh' });
  INSTALL.steps.forEach(t => cues.push({ t, kind: 'tap' }));
  cues.push({ t: INSTALL.drop, kind: 'install' });
  cues.push({ t: DEVICES.in[0], kind: 'whoosh' });
  cues.push({ t: END.icon, kind: 'swell' });
  return cues.sort((a, b) => a.t - b.t);
}
