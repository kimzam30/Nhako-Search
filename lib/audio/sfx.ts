/**
 * Game sound effects.
 *
 * Synthesised like the ambience, so they add no download weight and have no
 * licence to track. The kit follows what shipping word games do: a soft click
 * on every control, a note per letter that climbs as a word is traced, a chime
 * that rises with the combo, a bell per star and a short fanfare to finish.
 * Everything is kept soft and round (sine/triangle, fast decay) so it sits on
 * top of the lofi ambience instead of fighting it.
 */

export type EffectName =
  | 'tap'
  | 'select'
  | 'found'
  | 'combo'
  | 'miss'
  | 'hint'
  | 'star'
  | 'win'
  | 'whoosh'
  | 'pop'
  | 'unlock'
  | 'countdown'
  | 'go';

/** C major pentatonic from C5 up: tracing a word walks up this ladder. */
const LADDER = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093, 2349.32, 2637.02];

/** A short tone with a soft attack and exponential tail. */
function tone(
  ctx: AudioContext,
  dest: AudioNode,
  at: number,
  freq: number,
  duration: number,
  peak: number,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.012, duration * 0.2));
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  osc.connect(env).connect(dest);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

/** A bell: fundamental plus a quiet inharmonic partial, which is what makes it ring. */
function bell(ctx: AudioContext, dest: AudioNode, at: number, freq: number, duration: number, peak: number) {
  tone(ctx, dest, at, freq, duration, peak);
  tone(ctx, dest, at, freq * 2.76, duration * 0.45, peak * 0.22);
  tone(ctx, dest, at, freq * 5.4, duration * 0.2, peak * 0.08);
}

/** A marimba-ish pluck: triangle body, sine octave on top, very short. */
function pluck(ctx: AudioContext, dest: AudioNode, at: number, freq: number, peak: number) {
  tone(ctx, dest, at, freq, 0.14, peak, 'triangle');
  tone(ctx, dest, at, freq * 2, 0.06, peak * 0.35);
}

/** A pitch glide, for pops and bonks. */
function glide(
  ctx: AudioContext,
  dest: AudioNode,
  at: number,
  from: number,
  to: number,
  duration: number,
  peak: number,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + duration);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(peak, at + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(env).connect(dest);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

let noiseBuffer: AudioBuffer | null = null;
function noise(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

/** Band-passed noise swept upward: the page-turn / card whoosh. */
function whoosh(ctx: AudioContext, dest: AudioNode, at: number, duration: number, peak: number) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(380, at);
  bp.frequency.exponentialRampToValueAtTime(2400, at + duration);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(peak, at + duration * 0.4);
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  src.connect(bp).connect(env).connect(dest);
  src.start(at);
  src.stop(at + duration + 0.02);
}

/**
 * `n` is the effect's variant: letters traced so far for `select`, combo level
 * for `found`/`combo`, star index for `star`.
 */
export function playEffect(ctx: AudioContext, dest: AudioNode, name: EffectName, n = 0) {
  const now = ctx.currentTime + 0.001;

  switch (name) {
    case 'tap': {
      // A soft wooden click: quick downward blip, barely there.
      glide(ctx, dest, now, 1400, 700, 0.05, 0.09, 'triangle');
      break;
    }
    case 'select': {
      const f = LADDER[Math.min(Math.max(n - 1, 0), LADDER.length - 1)];
      pluck(ctx, dest, now, f, 0.1);
      break;
    }
    case 'found': {
      // A rising triad, lifted a step for every link in the combo.
      const lift = Math.pow(2, (Math.min(n, 6) * 2) / 12);
      [659.25, 830.61, 987.77].forEach((f, i) => bell(ctx, dest, now + i * 0.065, f * lift, 0.5, 0.16));
      break;
    }
    case 'combo': {
      // A sparkle run on top of the found chime.
      for (let i = 0; i < 5; i++) tone(ctx, dest, now + 0.12 + i * 0.035, 1568 * Math.pow(2, (i * 2 + n) / 12), 0.18, 0.05);
      break;
    }
    case 'miss': {
      // A low, soft bonk: acknowledges the attempt without scolding.
      glide(ctx, dest, now, 220, 110, 0.16, 0.12, 'triangle');
      glide(ctx, dest, now + 0.07, 180, 95, 0.14, 0.07, 'triangle');
      break;
    }
    case 'hint': {
      // Magic-wand twinkle.
      [1318.51, 1567.98, 2093].forEach((f, i) => tone(ctx, dest, now + i * 0.05, f, 0.2, 0.08));
      whoosh(ctx, dest, now, 0.22, 0.04);
      break;
    }
    case 'star': {
      bell(ctx, dest, now, [783.99, 987.77, 1174.66][Math.min(n, 2)], 0.7, 0.2);
      break;
    }
    case 'win': {
      // Short fanfare: arpeggio up, then a held major chord.
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => pluck(ctx, dest, now + i * 0.08, f, 0.14));
      [523.25, 659.25, 783.99, 1046.5].forEach(f => bell(ctx, dest, now + 0.36, f, 1.1, 0.09));
      for (let i = 0; i < 6; i++) tone(ctx, dest, now + 0.5 + i * 0.04, 2093 * Math.pow(2, i / 12), 0.2, 0.035);
      break;
    }
    case 'whoosh': {
      whoosh(ctx, dest, now, 0.26, 0.07);
      break;
    }
    case 'pop': {
      glide(ctx, dest, now, 520, 1200, 0.07, 0.12);
      break;
    }
    case 'unlock': {
      bell(ctx, dest, now, 880, 0.35, 0.14);
      bell(ctx, dest, now + 0.09, 1318.51, 0.5, 0.14);
      break;
    }
    case 'countdown': {
      pluck(ctx, dest, now, 659.25, 0.16);
      break;
    }
    case 'go': {
      [659.25, 830.61, 987.77, 1318.51].forEach(f => bell(ctx, dest, now, f, 0.6, 0.1));
      break;
    }
  }
}

/** Short, non-intrusive haptic. Ignored where unsupported (iOS Safari). */
export function haptic(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}
