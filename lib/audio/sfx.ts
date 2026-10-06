/**
 * Game sound effects.
 *
 * Synthesised like the ambience, so they add no download weight and have no
 * licence to track. The kit follows what shipping word games do: a soft click
 * on every control, a note per letter that climbs as a word is traced, a chime
 * that rises with the combo, a bell per star and a short fanfare to finish.
 *
 * v2 voice: wooden mallets and soft glass instead of bare sines. Every note
 * has a body partial (marimba-style 4x overtone that dies fast), a low-passed
 * top so nothing is shrill on headphones, and everything plays into one small
 * warm room, which is what makes separate beeps sound like one instrument.
 * The register sits an octave lower than v1 (G4 up rather than C5 up).
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

type Ctx = BaseAudioContext;

/** G major pentatonic from G4: tracing a word walks up this ladder. */
const LADDER = [392, 440, 493.88, 587.33, 659.25, 783.99, 880, 987.77, 1174.66, 1318.51, 1567.98, 1760];

// ------------------------------------------------------------------ the room

const rooms = new WeakMap<AudioNode, AudioNode>();

/** A short, dark room impulse: decaying noise smoothed by a one-pole lowpass. */
function roomImpulse(ctx: Ctx): AudioBuffer {
  const seconds = 1.3;
  const length = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      lp += ((Math.random() * 2 - 1) - lp) * 0.35;
      d[i] = lp * Math.pow(1 - i / length, 3.2);
    }
  }
  return buf;
}

/**
 * Every effect enters here: a gentle top cut, then dry plus a quiet send to
 * the room. Built once per destination and reused.
 */
function bus(ctx: Ctx, dest: AudioNode): AudioNode {
  const hit = rooms.get(dest);
  if (hit) return hit;
  const input = ctx.createBiquadFilter();
  input.type = 'lowpass';
  input.frequency.value = 5200;
  input.Q.value = 0.5;
  // Makeup gain: the softer voices land at about the loudness of v1.
  const level = ctx.createGain();
  level.gain.value = 1.6;
  level.connect(dest);
  input.connect(level);
  const send = ctx.createGain();
  send.gain.value = 0.22;
  const verb = ctx.createConvolver();
  verb.buffer = roomImpulse(ctx);
  input.connect(send).connect(verb).connect(level);
  rooms.set(dest, input);
  return input;
}

// ----------------------------------------------------------------- voices

/** One partial: sine (or other) with a fast attack and an exponential tail. */
function partial(
  ctx: Ctx,
  out: AudioNode,
  at: number,
  freq: number,
  decay: number,
  peak: number,
  opts: { type?: OscillatorType; attack?: number; glideTo?: number; detune?: number } = {}
) {
  const osc = ctx.createOscillator();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, at);
  if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, at + decay * 0.8);
  if (opts.detune) osc.detune.value = opts.detune;
  const g = ctx.createGain();
  const attack = opts.attack ?? 0.004;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + attack);
  g.gain.setTargetAtTime(0, at + attack, decay / 4);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + attack + decay * 1.6);
}

/** Wooden mallet: round fundamental, a 4x overtone that dies almost at once. */
function mallet(ctx: Ctx, out: AudioNode, at: number, f: number, peak: number, decay = 0.32) {
  partial(ctx, out, at, f, decay, peak);
  partial(ctx, out, at, f * 4, decay * 0.18, peak * 0.16);
  partial(ctx, out, at, f * 2, decay * 0.5, peak * 0.1, { type: 'triangle' });
}

/** Soft glass: two slightly detuned sines and a quiet octave, long and calm. */
function glass(ctx: Ctx, out: AudioNode, at: number, f: number, peak: number, decay = 1.2) {
  partial(ctx, out, at, f, decay, peak * 0.6, { attack: 0.008, detune: -4 });
  partial(ctx, out, at, f, decay, peak * 0.6, { attack: 0.008, detune: 5 });
  partial(ctx, out, at, f * 2, decay * 0.45, peak * 0.14, { attack: 0.006 });
}

const noiseBuffers = new WeakMap<Ctx, AudioBuffer>();
function noise(ctx: Ctx): AudioBuffer {
  let buf = noiseBuffers.get(ctx);
  if (buf) return buf;
  buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.6), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffers.set(ctx, buf);
  return buf;
}

/** Breath of air: band-passed noise swept gently upward, like a page turning. */
function air(ctx: Ctx, out: AudioNode, at: number, duration: number, peak: number, from = 320, to = 1500) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.9;
  bp.frequency.setValueAtTime(from, at);
  bp.frequency.exponentialRampToValueAtTime(to, at + duration);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + duration * 0.45);
  g.gain.linearRampToValueAtTime(0, at + duration);
  src.connect(bp).connect(g).connect(out);
  src.start(at);
  src.stop(at + duration + 0.02);
}

const semis = (n: number) => Math.pow(2, n / 12);

/**
 * `n` is the effect's variant: letters traced so far for `select`, combo level
 * for `found`/`combo`, star index for `star`.
 */
export function playEffect(ctx: Ctx, dest: AudioNode, name: EffectName, n = 0, at?: number) {
  const out = bus(ctx, dest);
  const now = at ?? ctx.currentTime + 0.005;

  switch (name) {
    case 'tap': {
      // A soft wooden "tok": barely pitched, over in 40 ms.
      partial(ctx, out, now, 760, 0.045, 0.05, { glideTo: 520, attack: 0.002 });
      partial(ctx, out, now, 1900, 0.012, 0.012, { attack: 0.001 });
      break;
    }
    case 'select': {
      const f = LADDER[Math.min(Math.max(n - 1, 0), LADDER.length - 1)];
      mallet(ctx, out, now, f, 0.075, 0.22);
      break;
    }
    case 'found': {
      // A rising mallet arpeggio over a glass chord, lifted a whole step per combo link.
      const lift = semis(Math.min(n, 5) * 2);
      [523.25, 659.25, 783.99].forEach((f, i) => mallet(ctx, out, now + i * 0.06, f * lift, 0.09, 0.4));
      glass(ctx, out, now + 0.12, 1046.5 * lift, 0.05, 1.1);
      break;
    }
    case 'combo': {
      // A light sparkle above the found chime, climbing with the combo.
      for (let i = 0; i < 4; i++) {
        mallet(ctx, out, now + 0.16 + i * 0.045, 1046.5 * semis([0, 4, 7, 12][i] + Math.min(n, 5)), 0.03, 0.25);
      }
      break;
    }
    case 'miss': {
      // A low, rounded "bloop": acknowledges the attempt without scolding.
      partial(ctx, out, now, 280, 0.16, 0.07, { glideTo: 190, attack: 0.006 });
      partial(ctx, out, now, 560, 0.06, 0.012, { glideTo: 380 });
      break;
    }
    case 'hint': {
      // A harp-like lift and a breath of air: something was revealed.
      [659.25, 783.99, 987.77, 1318.51].forEach((f, i) => mallet(ctx, out, now + i * 0.05, f, 0.05, 0.4));
      glass(ctx, out, now + 0.2, 1567.98, 0.025, 0.9);
      air(ctx, out, now, 0.35, 0.02, 600, 2200);
      break;
    }
    case 'star': {
      const f = [783.99, 987.77, 1174.66][Math.min(n, 2)];
      mallet(ctx, out, now, f, 0.08, 0.45);
      glass(ctx, out, now, f, 0.06, 1.1);
      break;
    }
    case 'win': {
      // A short fanfare: mallets up the chord, then a held glass chord.
      [392, 493.88, 587.33, 783.99, 987.77].forEach((f, i) => mallet(ctx, out, now + i * 0.075, f, 0.085, 0.45));
      [392, 493.88, 587.33, 783.99].forEach(f => glass(ctx, out, now + 0.4, f, 0.045, 1.8));
      for (let i = 0; i < 5; i++) mallet(ctx, out, now + 0.55 + i * 0.05, 1567.98 * semis([0, 2, 4, 7, 9][i]), 0.02, 0.3);
      break;
    }
    case 'whoosh': {
      air(ctx, out, now, 0.3, 0.07);
      break;
    }
    case 'pop': {
      // A bubble landing: a quick upward glide, round and quiet.
      partial(ctx, out, now, 420, 0.09, 0.06, { glideTo: 880, attack: 0.003 });
      break;
    }
    case 'unlock': {
      mallet(ctx, out, now, 659.25, 0.08, 0.35);
      glass(ctx, out, now + 0.09, 987.77, 0.06, 1.2);
      break;
    }
    case 'countdown': {
      mallet(ctx, out, now, 587.33, 0.1, 0.3);
      break;
    }
    case 'go': {
      [587.33, 739.99, 880, 1174.66].forEach((f, i) => mallet(ctx, out, now + i * 0.02, f, 0.06, 0.45));
      glass(ctx, out, now, 1174.66, 0.05, 1.2);
      break;
    }
  }
}

/**
 * Renders effects offline for listening tests: each name in turn, `gap`
 * seconds apart. Used by the debug hook, never in normal play.
 */
export async function renderEffects(names: [EffectName, number?][], gap = 0.9, sampleRate = 44100): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil((names.length * gap + 2) * sampleRate), sampleRate);
  const dest = ctx.createGain();
  dest.gain.value = 0.9;
  dest.connect(ctx.destination);
  names.forEach(([name, n], i) => playEffect(ctx, dest, name, n ?? 0, 0.1 + i * gap));
  return ctx.startRendering();
}

/** Short, non-intrusive haptic. Ignored where unsupported (iOS Safari). */
export function haptic(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}
