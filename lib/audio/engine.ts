/**
 * Procedural ambience engine, v2.
 *
 * Everything is synthesised with Web Audio: no files, no bandwidth, no
 * licences, no loop seams, and it never repeats. v2 rebuilt every layer:
 *
 *   rain     stereo wash + individually scheduled droplets and surface
 *            "plinks" + a low roof layer, with breathing intensity
 *   thunder  a crack for near strikes, then a rolling rumble with sub-bass
 *            swells, deep in the reverb; frequency follows the rain level
 *   wind     decorrelated stereo gusts, a whistle that rides the gusts, and
 *            leaves rustling in the strong ones
 *   birds    five species (warbler, chickadee "fee-bee", finch trill, dove
 *            coo, sparrow chips) at random distances and positions
 *   lofi     four selectable tracks: swung drums, walking bass, an FM
 *            electric piano with tape wobble, a sparse melody and vinyl
 *
 * All events go through one look-ahead scheduler, so timing is sample-tight
 * and the same voices can also be rendered offline (renderAmbience) — which is
 * how the test suite checks levels and clipping without a speaker.
 */

export type ChannelId = 'lofi' | 'rain' | 'wind' | 'birds' | 'thunder';

export const CHANNEL_IDS: ChannelId[] = ['lofi', 'rain', 'wind', 'birds', 'thunder'];

type Ctx = BaseAudioContext;

/** A sound source that schedules its own events a window at a time. */
interface Voice {
  schedule(from: number, to: number): void;
  dispose(): void;
}

// ---------------------------------------------------------------- utilities

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

type NoiseColor = 'white' | 'pink' | 'brown';
const noiseCache = new WeakMap<Ctx, Map<string, AudioBuffer>>();

/** Stereo noise with decorrelated channels, cached per context. */
function noise(ctx: Ctx, color: NoiseColor, seconds = 6): AudioBuffer {
  let byCtx = noiseCache.get(ctx);
  if (!byCtx) noiseCache.set(ctx, (byCtx = new Map()));
  const key = `${color}:${seconds}`;
  const hit = byCtx.get(key);
  if (hit) return hit;

  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buffer.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      if (color === 'white') d[i] = w * 0.5;
      else if (color === 'pink') {
        // Paul Kellet's refined pink filter.
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    // Crossfade the ends so the loop point has no click.
    const fade = Math.floor(ctx.sampleRate * 0.05);
    for (let i = 0; i < fade; i++) {
      const g = i / fade;
      d[length - fade + i] = d[length - fade + i] * (1 - g) + d[i] * g;
    }
  }
  byCtx.set(key, buffer);
  return buffer;
}

function loop(ctx: Ctx, buffer: AudioBuffer): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

function biquad(ctx: Ctx, type: BiquadFilterType, freq: number, q = 0.707, gain = 0): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  f.gain.value = gain;
  return f;
}

function gainNode(ctx: Ctx, value: number): GainNode {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

function panner(ctx: Ctx, pan: number): AudioNode {
  // StereoPanner is missing from some older WebKit builds.
  if ('createStereoPanner' in ctx) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    return p;
  }
  return gainNode(ctx, 1);
}

/** A generated room: decaying stereo noise with a short pre-delay. */
function impulse(ctx: Ctx, seconds: number, decay: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  const pre = Math.floor(ctx.sampleRate * 0.02);
  for (let ch = 0; ch < 2; ch++) {
    const d = buffer.getChannelData(ch);
    for (let i = pre; i < length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - (i - pre) / (length - pre), decay);
    }
  }
  return buffer;
}

/** Envelope helper: attack then exponential decay to silence. */
function env(g: AudioParam, t: number, peak: number, attack: number, decay: number) {
  g.setValueAtTime(0.0001, t);
  g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

// -------------------------------------------------------------------- rain

function createRain(ctx: Ctx, out: AudioNode): Voice {
  const bus = gainNode(ctx, 1);
  bus.connect(out);

  // Wash: stereo pink noise shaped to the hiss of falling water.
  const wash = loop(ctx, noise(ctx, 'pink', 7));
  const washGain = gainNode(ctx, 0.5);
  wash
    .connect(biquad(ctx, 'highpass', 450))
    .connect(biquad(ctx, 'peaking', 3200, 0.8, 3))
    .connect(biquad(ctx, 'lowpass', 9500))
    .connect(washGain)
    .connect(bus);

  // Roof: the low patter under it.
  const roof = loop(ctx, noise(ctx, 'brown', 6));
  const roofLp = biquad(ctx, 'lowpass', 520);
  const roofGain = gainNode(ctx, 0.28);
  roof.connect(roofLp).connect(roofGain).connect(bus);

  wash.start(0, rand(0, 6));
  roof.start(0, rand(0, 5));

  const drops = gainNode(ctx, 0.9);
  drops.connect(bus);
  const dropBuf = noise(ctx, 'white', 1);
  let nextGust = 0;
  let nextPlink = -1;

  return {
    schedule(from, to) {
      // Intensity breathes every few seconds.
      while (nextGust < to) {
        const t = Math.max(from, nextGust);
        washGain.gain.setTargetAtTime(rand(0.36, 0.62), t, 2.2);
        roofLp.frequency.setTargetAtTime(rand(380, 680), t, 2.8);
        nextGust = t + rand(3, 6);
      }
      // Droplets: short resonant ticks spread across the stereo field.
      const rate = 42;
      let t = from + (Math.random() / rate);
      while (t < to) {
        const src = ctx.createBufferSource();
        src.buffer = dropBuf;
        const bp = biquad(ctx, 'bandpass', rand(1800, 7200), rand(2, 9));
        const g = ctx.createGain();
        env(g.gain, t, rand(0.05, 0.22), 0.0015, rand(0.012, 0.05));
        src.connect(bp).connect(g).connect(panner(ctx, rand(-0.95, 0.95))).connect(drops);
        src.start(t, rand(0, 0.9), 0.08);
        t += -Math.log(1 - Math.random()) / rate;
      }
      // Plinks: a drop landing in a puddle, a small falling pitch.
      if (nextPlink < from) nextPlink = from + rand(0, 0.8);
      while (nextPlink < to) {
        const p = nextPlink;
        const osc = ctx.createOscillator();
        const f0 = rand(1300, 2700);
        osc.frequency.setValueAtTime(f0, p);
        osc.frequency.exponentialRampToValueAtTime(f0 * 0.62, p + 0.045);
        const g = ctx.createGain();
        env(g.gain, p, rand(0.015, 0.05), 0.002, 0.05);
        osc.connect(g).connect(panner(ctx, rand(-0.8, 0.8))).connect(drops);
        osc.start(p);
        osc.stop(p + 0.07);
        nextPlink = p + rand(0.25, 1.1);
      }
    },
    dispose() {
      try {
        wash.stop();
        roof.stop();
      } catch {
        /* already stopped */
      }
      bus.disconnect();
    },
  };
}

// ----------------------------------------------------------------- thunder

function strike(ctx: Ctx, out: AudioNode, t: number) {
  const distance = Math.random(); // 0 overhead, 1 far away
  const dur = rand(4, 8) + distance * 2;

  // The crack: only close strikes have one.
  if (distance < 0.55) {
    const crack = ctx.createBufferSource();
    crack.buffer = noise(ctx, 'white', 1);
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = Math.tanh(x * 3);
    }
    shaper.curve = curve;
    const g = ctx.createGain();
    env(g.gain, t, 0.55 * (1 - distance), 0.002, rand(0.12, 0.3));
    crack.connect(biquad(ctx, 'highpass', 900)).connect(shaper).connect(g).connect(out);
    crack.start(t, rand(0, 0.5), 0.5);
  }

  // The rumble: brown noise through a lowpass that closes as it rolls away,
  // with several swells rather than one smooth decay.
  const rumble = ctx.createBufferSource();
  rumble.buffer = noise(ctx, 'brown', 6);
  const lp = biquad(ctx, 'lowpass', 700 - distance * 400, 0.9);
  lp.frequency.setValueAtTime(700 - distance * 400, t);
  lp.frequency.exponentialRampToValueAtTime(70 + (1 - distance) * 60, t + dur);
  const g = ctx.createGain();
  const peak = 0.9 - distance * 0.45;
  const attack = 0.03 + distance * 0.6;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  let at = t + attack;
  const swells = Math.floor(rand(2, 5));
  for (let i = 0; i < swells; i++) {
    at += rand(0.4, dur / (swells + 1));
    g.gain.exponentialRampToValueAtTime(peak * rand(0.25, 0.85), at);
  }
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  rumble.connect(lp).connect(g).connect(out);
  rumble.start(t, rand(0, 5));
  rumble.stop(t + dur + 0.1);

  // Sub-bass body, felt more than heard.
  const sub = ctx.createOscillator();
  sub.frequency.value = rand(36, 52);
  const sg = ctx.createGain();
  env(sg.gain, t + attack * 0.5, peak * 0.35, 0.08, dur * 0.6);
  sub.connect(sg).connect(out);
  sub.start(t);
  sub.stop(t + dur);
}

function createThunder(ctx: Ctx, out: AudioNode, rainLevel: () => number): Voice {
  // The first roll comes soon after the channel is raised, then storms space out.
  let next = -1;
  return {
    schedule(from, to) {
      if (next < 0) next = from + rand(3, 10);
      while (next < to) {
        if (next >= from) strike(ctx, out, next);
        const rain = Math.min(1, Math.max(0, rainLevel()));
        // Heavy rain: every ~15 s. Clear sky: the odd distant roll.
        const mean = 70 - rain * 55;
        next += rand(mean * 0.5, mean * 1.5);
      }
    },
    dispose() {},
  };
}

// -------------------------------------------------------------------- wind

function createWind(ctx: Ctx, out: AudioNode): Voice {
  const bus = gainNode(ctx, 1.4);
  bus.connect(out);

  const body = loop(ctx, noise(ctx, 'brown', 7));
  const band = biquad(ctx, 'bandpass', 420, 0.7);
  const bodyGain = gainNode(ctx, 0.45);
  body.connect(band).connect(bodyGain).connect(bus);

  const whistleSrc = loop(ctx, noise(ctx, 'pink', 5));
  const whistle = biquad(ctx, 'bandpass', 820, 28);
  const whistleGain = gainNode(ctx, 0.04);
  whistleSrc.connect(whistle).connect(whistleGain).connect(bus);

  const leavesSrc = loop(ctx, noise(ctx, 'white', 4));
  const leavesGain = gainNode(ctx, 0);
  leavesSrc.connect(biquad(ctx, 'highpass', 3200)).connect(biquad(ctx, 'lowpass', 9000)).connect(leavesGain).connect(bus);

  body.start(0, rand(0, 6));
  whistleSrc.start(0, rand(0, 4));
  leavesSrc.start(0, rand(0, 3));

  let nextGust = 0;
  let gust = 0.4;
  let nextFlutter = 0;
  return {
    schedule(from, to) {
      while (nextGust < to) {
        const t = Math.max(from, nextGust);
        gust = Math.random() < 0.25 ? rand(0.75, 1) : rand(0.2, 0.65);
        const tc = rand(0.8, 2.2);
        bodyGain.gain.setTargetAtTime(0.25 + gust * 0.55, t, tc);
        band.frequency.setTargetAtTime(280 + gust * 520, t, tc);
        whistle.frequency.setTargetAtTime(rand(600, 1150), t, tc * 1.5);
        whistleGain.gain.setTargetAtTime(gust > 0.6 ? gust * 0.09 : 0.015, t, tc);
        nextGust = t + rand(1.8, 4.5);
      }
      // Leaves flutter only in the stronger gusts.
      while (nextFlutter < to) {
        const t = Math.max(from, nextFlutter);
        const level = gust > 0.55 ? gust * gust * rand(0.03, 0.14) : 0;
        leavesGain.gain.setTargetAtTime(level, t, 0.04);
        nextFlutter = t + rand(0.05, 0.14);
      }
    },
    dispose() {
      try {
        body.stop();
        whistleSrc.stop();
        leavesSrc.stop();
      } catch {
        /* already stopped */
      }
      bus.disconnect();
    },
  };
}

// ------------------------------------------------------------------- birds

type Call = (ctx: Ctx, out: AudioNode, t: number) => number;

/** One sung note: a sine with a pitch path, vibrato and a soft envelope. */
function note(ctx: Ctx, out: AudioNode, t: number, f0: number, f1: number, dur: number, peak: number, vib = 0) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
  if (vib) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rand(28, 55);
    const depth = gainNode(ctx, vib);
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.02);
  }
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.012, dur * 0.3));
  g.gain.setValueAtTime(peak, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const warbler: Call = (ctx, out, t) => {
  const n = Math.floor(rand(4, 9));
  let at = t;
  let f = rand(2600, 4200);
  for (let i = 0; i < n; i++) {
    const next = Math.min(5200, Math.max(2000, f * rand(0.78, 1.28)));
    const d = rand(0.06, 0.13);
    note(ctx, out, at, f, next, d, rand(0.25, 0.45), rand(60, 140));
    at += d + rand(0.02, 0.06);
    f = next;
  }
  return at - t;
};

const feeBee: Call = (ctx, out, t) => {
  const hi = rand(3900, 4200);
  note(ctx, out, t, hi, hi * 0.99, 0.34, 0.35);
  note(ctx, out, t + 0.4, hi * 0.84, hi * 0.83, 0.28, 0.3);
  // Sometimes the "bee" is split in two, as real chickadees do.
  if (Math.random() < 0.4) note(ctx, out, t + 0.72, hi * 0.83, hi * 0.82, 0.16, 0.22);
  return 0.9;
};

const trill: Call = (ctx, out, t) => {
  const n = Math.floor(rand(12, 26));
  const rate = rand(15, 22);
  const top = rand(4500, 6000);
  for (let i = 0; i < n; i++) {
    const shape = Math.sin((i / (n - 1)) * Math.PI);
    note(ctx, out, t + i / rate, top, top * 0.7, 0.028, 0.08 + shape * 0.3);
  }
  return n / rate;
};

const dove: Call = (ctx, out, t) => {
  // "hoo-HOO-hoo-hoo": low, round, distant.
  const base = rand(470, 560);
  const phrase: [number, number, number][] = [
    [1.0, 0.25, 0.3],
    [1.15, 0.5, 0.45],
    [0.95, 0.3, 0.32],
    [0.95, 0.3, 0.3],
  ];
  let at = t;
  for (const [ratio, d, peak] of phrase) {
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(base * ratio, at);
    osc.frequency.linearRampToValueAtTime(base * ratio * 0.97, at + d);
    const h2 = ctx.createOscillator();
    h2.frequency.setValueAtTime(base * ratio * 2, at);
    const h2g = gainNode(ctx, 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, at + d);
    osc.connect(g);
    h2.connect(h2g).connect(g);
    g.connect(biquad(ctx, 'lowpass', 1400)).connect(out);
    osc.start(at);
    h2.start(at);
    osc.stop(at + d + 0.02);
    h2.stop(at + d + 0.02);
    at += d + 0.16;
  }
  return at - t;
};

const sparrow: Call = (ctx, out, t) => {
  const n = Math.floor(rand(2, 5));
  for (let i = 0; i < n; i++) {
    const f = rand(2800, 3600);
    note(ctx, out, t + i * rand(0.12, 0.2), f, f * rand(1.5, 1.9), 0.035, 0.35);
  }
  return n * 0.2;
};

const SPECIES: [Call, number][] = [
  [warbler, 3],
  [feeBee, 2],
  [trill, 2],
  [sparrow, 2],
  [dove, 1],
];

function pickSpecies(): Call {
  const total = SPECIES.reduce((n, [, w]) => n + w, 0);
  let r = Math.random() * total;
  for (const [call, w] of SPECIES) {
    if ((r -= w) <= 0) return call;
  }
  return warbler;
}

function createBirds(ctx: Ctx, out: AudioNode): Voice {
  const bus = gainNode(ctx, 1.25);
  bus.connect(out);
  let next = -1;
  return {
    schedule(from, to) {
      if (next < 0) next = from + rand(0.3, 1.5);
      while (next < to) {
        if (next >= from) {
          // Each call from its own spot: near and bright, or far and soft.
          const distance = Math.random();
          const g = gainNode(ctx, 1 - distance * 0.7);
          const lp = biquad(ctx, 'lowpass', 9000 - distance * 5500);
          g.connect(lp).connect(panner(ctx, rand(-0.85, 0.85))).connect(bus);
          const length = pickSpecies()(ctx, g, next);
          // Sometimes a second bird answers.
          next += length + (Math.random() < 0.3 ? rand(0.3, 1) : rand(1.5, 5.5));
        } else {
          next = from;
        }
      }
    },
    dispose() {
      bus.disconnect();
    },
  };
}

// -------------------------------------------------------------------- lofi

export interface LofiTrack {
  id: string;
  label: string;
  bpm: number;
  /** 0 = straight, 0.33 = hard swing on the 16ths. */
  swing: number;
  /** One chord per bar, MIDI note numbers. */
  chords: number[][];
  /** Bass root per bar, MIDI. */
  bass: number[];
  /** Scale for the melody, MIDI (upper octave). */
  scale: number[];
  kick: number[];
  snare: number[];
  hat: number[];
}

export const LOFI_TRACKS: LofiTrack[] = [
  {
    id: 'sunday',
    label: 'Sunday morning',
    bpm: 78,
    swing: 0.22,
    chords: [
      [53, 57, 60, 64],
      [52, 55, 59, 62],
      [50, 53, 57, 60],
      [48, 52, 55, 59, 62],
    ],
    bass: [41, 40, 38, 36],
    scale: [72, 74, 76, 77, 79, 81, 84],
    kick: [1, 0, 0, 0, 0, 0, 0.7, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0.3],
    hat: [0.8, 0, 0.5, 0, 0.8, 0, 0.5, 0.3, 0.8, 0, 0.5, 0, 0.8, 0, 0.5, 0.4],
  },
  {
    id: 'cafe',
    label: 'Rainy café',
    bpm: 72,
    swing: 0.28,
    chords: [
      [57, 60, 64, 67, 71],
      [50, 53, 57, 60, 64],
      [55, 59, 64, 65, 69],
      [48, 52, 55, 59, 62],
    ],
    bass: [45, 38, 43, 36],
    scale: [69, 72, 74, 76, 79, 81],
    kick: [1, 0, 0, 0.5, 0, 0, 0, 0, 1, 0, 0.6, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0.7, 0, 0.4, 0, 0.7, 0, 0.4, 0, 0.7, 0, 0.4, 0, 0.7, 0.3, 0.4, 0],
  },
  {
    id: 'night',
    label: 'Night drive',
    bpm: 84,
    swing: 0.16,
    chords: [
      [48, 51, 55, 58, 62],
      [44, 48, 51, 55],
      [51, 55, 58, 62],
      [46, 50, 53, 55],
    ],
    bass: [36, 32, 39, 34],
    scale: [72, 75, 77, 79, 82, 84],
    kick: [1, 0, 0, 0, 0, 0, 0, 0.6, 1, 0, 0, 0, 0, 0, 0.5, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0.8, 0.3, 0.6, 0.3, 0.8, 0.3, 0.6, 0.3, 0.8, 0.3, 0.6, 0.3, 0.8, 0.3, 0.6, 0.5],
  },
  {
    id: 'garden',
    label: 'Garden swing',
    bpm: 70,
    swing: 0.3,
    chords: [
      [50, 54, 57, 61],
      [47, 50, 54, 57],
      [55, 59, 62, 66],
      [57, 62, 64, 67],
    ],
    bass: [38, 35, 43, 45],
    scale: [74, 76, 78, 81, 83, 86],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0.4, 0],
    snare: [0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0],
    hat: [0.6, 0, 0.35, 0, 0.6, 0, 0.35, 0, 0.6, 0, 0.35, 0, 0.6, 0, 0.35, 0.25],
  },
];

export const DEFAULT_LOFI_TRACK = LOFI_TRACKS[0].id;

function kick(ctx: Ctx, out: AudioNode, t: number, v: number) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(46, t + 0.11);
  const g = ctx.createGain();
  env(g.gain, t, 0.9 * v, 0.004, 0.32);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + 0.4);
}

function snare(ctx: Ctx, out: AudioNode, t: number, v: number) {
  const n = ctx.createBufferSource();
  n.buffer = noise(ctx, 'white', 1);
  const g = ctx.createGain();
  env(g.gain, t, 0.32 * v, 0.003, 0.17);
  n.connect(biquad(ctx, 'bandpass', 1900, 0.7)).connect(g).connect(out);
  n.start(t, rand(0, 0.7), 0.25);
  const body = ctx.createOscillator();
  body.frequency.setValueAtTime(200, t);
  body.frequency.exponentialRampToValueAtTime(160, t + 0.08);
  const bg = ctx.createGain();
  env(bg.gain, t, 0.22 * v, 0.003, 0.09);
  body.connect(bg).connect(out);
  body.start(t);
  body.stop(t + 0.15);
}

function hat(ctx: Ctx, out: AudioNode, t: number, v: number) {
  const n = ctx.createBufferSource();
  n.buffer = noise(ctx, 'white', 1);
  const g = ctx.createGain();
  env(g.gain, t, 0.13 * v, 0.002, rand(0.025, 0.05));
  n.connect(biquad(ctx, 'highpass', 7200)).connect(g).connect(out);
  n.start(t, rand(0, 0.8), 0.08);
}

function bassNote(ctx: Ctx, out: AudioNode, t: number, midi: number, dur: number) {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = midiHz(midi);
  const sine = ctx.createOscillator();
  sine.frequency.value = midiHz(midi);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.42, t + 0.015);
  g.gain.setTargetAtTime(0.28, t + 0.05, 0.3);
  g.gain.setTargetAtTime(0.0001, t + dur, 0.06);
  const lp = biquad(ctx, 'lowpass', 420);
  osc.connect(lp);
  sine.connect(lp);
  lp.connect(g).connect(out);
  osc.start(t);
  sine.start(t);
  osc.stop(t + dur + 0.4);
  sine.stop(t + dur + 0.4);
}

/** FM electric piano: a ratio-1 modulator whose index decays gives the tine attack. */
function epNote(ctx: Ctx, out: AudioNode, wow: AudioNode, t: number, midi: number, v: number, dur: number) {
  const f = midiHz(midi);
  const car = ctx.createOscillator();
  car.frequency.value = f;
  const mod = ctx.createOscillator();
  mod.frequency.value = f;
  const index = ctx.createGain();
  index.gain.setValueAtTime(f * 2.2, t);
  index.gain.exponentialRampToValueAtTime(f * 0.25, t + 0.5);
  mod.connect(index).connect(car.frequency);
  // A second, slightly detuned carrier for chorus width.
  const car2 = ctx.createOscillator();
  car2.frequency.value = f;
  car2.detune.value = rand(4, 9);
  wow.connect(car.detune);
  wow.connect(car2.detune);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12 * v, t + 0.006);
  g.gain.setTargetAtTime(0.05 * v, t + 0.02, 0.5);
  g.gain.setTargetAtTime(0.0001, t + dur, 0.25);
  const g2 = gainNode(ctx, 0.35);
  car.connect(g);
  car2.connect(g2).connect(g);
  g.connect(out);
  const end = t + dur + 1.2;
  [car, car2, mod].forEach(o => {
    o.start(t);
    o.stop(end);
  });
}

function bellNote(ctx: Ctx, out: AudioNode, t: number, midi: number) {
  const f = midiHz(midi);
  for (const [ratio, peak, d] of [[1, 0.09, 1.1], [2, 0.025, 0.6], [3.01, 0.012, 0.35]] as const) {
    const o = ctx.createOscillator();
    o.frequency.value = f * ratio;
    const g = ctx.createGain();
    env(g.gain, t, peak, 0.008, d);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + d + 0.1);
  }
}

function createLofi(ctx: Ctx, out: AudioNode, sample: AudioBuffer | null, getTrack: () => LofiTrack): Voice {
  // Cassette colour on everything: roll off the top, a little warmth.
  const tape = biquad(ctx, 'lowpass', 5200, 0.5);
  const warm = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    const x = i / 512 - 1;
    curve[i] = Math.tanh(1.4 * x) / Math.tanh(1.4);
  }
  warm.curve = curve;
  // Pre-shaper level: the loop sits around -18 dB RMS, level with the rain,
  // instead of the -7.5 dB it rendered at before this was tuned.
  const bus = gainNode(ctx, 0.22);
  bus.connect(warm).connect(tape).connect(out);

  if (sample) {
    const src = loop(ctx, sample);
    src.connect(bus);
    src.start(0);
    return {
      schedule() {},
      dispose() {
        try {
          src.stop();
        } catch {
          /* already stopped */
        }
        bus.disconnect();
      },
    };
  }

  const drums = gainNode(ctx, 0.75);
  drums.connect(biquad(ctx, 'lowpass', 7000)).connect(bus);
  const keys = gainNode(ctx, 1);
  keys.connect(bus);
  const bass = gainNode(ctx, 0.9);
  bass.connect(bus);
  const melody = gainNode(ctx, 0.8);
  melody.connect(bus);

  // Tape wobble: a slow drift on every key's pitch.
  const wowLfo = ctx.createOscillator();
  wowLfo.frequency.value = 0.31;
  const wow = gainNode(ctx, 6);
  wowLfo.connect(wow);
  wowLfo.start(0);

  // Vinyl: constant hiss under everything.
  const hiss = loop(ctx, noise(ctx, 'pink', 5));
  hiss.connect(biquad(ctx, 'highpass', 900)).connect(biquad(ctx, 'lowpass', 5000)).connect(gainNode(ctx, 0.035)).connect(bus);
  hiss.start(0, rand(0, 4));

  let barStart = -1;
  let bar = 0;
  let track = getTrack();

  const scheduleBar = (t0: number) => {
    // Track changes land on a bar line, so a switch never cuts mid-phrase.
    track = getTrack();
    const beat = 60 / track.bpm;
    const step = beat / 4;
    const chordIdx = bar % track.chords.length;
    const chord = track.chords[chordIdx];

    for (let s = 0; s < 16; s++) {
      const swing = s % 2 === 1 ? track.swing * step : 0;
      const t = t0 + s * step + swing + rand(-0.004, 0.004);
      if (track.kick[s]) {
        kick(ctx, drums, t, track.kick[s]);
        // Keys duck under the kick: the lofi "pump".
        keys.gain.setTargetAtTime(0.68, t, 0.01);
        keys.gain.setTargetAtTime(1, t + 0.06, 0.12);
      }
      if (track.snare[s]) snare(ctx, drums, t, track.snare[s] * rand(0.85, 1));
      if (track.hat[s] && Math.random() > 0.06) hat(ctx, drums, t, track.hat[s] * rand(0.7, 1));
    }

    // Bass: root on 1, a pickup on the "and" of 3.
    bassNote(ctx, bass, t0, track.bass[chordIdx], beat * 2.2);
    if (Math.random() < 0.7) bassNote(ctx, bass, t0 + beat * 2.5 + track.swing * step, track.bass[chordIdx] + pick([0, 7, 12]), beat * 1.2);

    // Keys: the chord, lightly strummed; re-struck on beat 3 half the time.
    chord.forEach((m, i) => epNote(ctx, keys, wow, t0 + i * rand(0.012, 0.026), m, rand(0.75, 1), beat * 3.6));
    if (Math.random() < 0.45) {
      chord.slice(1).forEach((m, i) => epNote(ctx, keys, wow, t0 + beat * 2 + track.swing * step + i * 0.015, m, rand(0.4, 0.6), beat * 1.5));
    }

    // Melody: a few pentatonic notes, never on every bar.
    if (bar % 4 !== 3) {
      for (let b = 0; b < 4; b++) {
        if (Math.random() < 0.3) bellNote(ctx, melody, t0 + b * beat + (Math.random() < 0.5 ? beat / 2 : 0), pick(track.scale));
      }
    }

    // Vinyl crackle.
    const crackles = Math.floor(rand(3, 9));
    for (let i = 0; i < crackles; i++) {
      const c = ctx.createBufferSource();
      c.buffer = noise(ctx, 'white', 1);
      const g = ctx.createGain();
      env(g.gain, t0 + rand(0, beat * 4), rand(0.02, 0.08), 0.0005, 0.004);
      c.connect(biquad(ctx, 'highpass', 2500)).connect(g).connect(bus);
      c.start(t0 + rand(0, beat * 4), rand(0, 0.9), 0.01);
    }
    bar++;
    return beat * 4;
  };

  return {
    schedule(from, to) {
      if (barStart < 0) barStart = from + 0.05;
      while (barStart < to) {
        if (barStart < from - 0.5) {
          // Fell far behind (tab was frozen): skip ahead instead of a burst.
          barStart = from + 0.05;
        }
        barStart += scheduleBar(barStart);
      }
    },
    dispose() {
      try {
        wowLfo.stop();
        hiss.stop();
      } catch {
        /* already stopped */
      }
      bus.disconnect();
    },
  };
}

/**
 * Optional real lofi recording.
 *
 * Null by default so no request is made at all — the generated tracks are the
 * shipped behaviour. Set this to '/audio/lofi.mp3' (and add the file) to use a
 * recording instead; it falls back to generation if the fetch or decode fails.
 */
export const LOFI_SAMPLE_URL: string | null = null;

export async function loadLofiSample(ctx: BaseAudioContext): Promise<AudioBuffer | null> {
  if (!LOFI_SAMPLE_URL) return null;
  try {
    const res = await fetch(LOFI_SAMPLE_URL);
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength < 1024) return null;
    return await ctx.decodeAudioData(bytes);
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ engine

export interface AmbienceEngine {
  context: BaseAudioContext;
  setChannelGain(id: ChannelId, value01: number, rampSeconds?: number): void;
  setMasterGain(value01: number, rampSeconds?: number): void;
  setLofiTrack(id: string): void;
  /** Schedules every voice for [from, to) — used by offline rendering. */
  scheduleWindow(from: number, to: number): void;
  dispose(): void;
}

/** How much of each channel goes to the shared reverb. */
const REVERB_SEND: Record<ChannelId, number> = { lofi: 0.18, rain: 0.12, wind: 0.15, birds: 0.24, thunder: 0.65 };

export function createAmbienceEngine(
  ctx: BaseAudioContext,
  initialVolumes: Record<ChannelId | 'master', number>,
  lofiSample: AudioBuffer | null,
  options: { lofiTrack?: string; realtime?: boolean } = {}
): AmbienceEngine {
  const realtime = options.realtime ?? true;

  // Master chain: a gentle compressor keeps the stacked layers from clipping.
  const master = gainNode(ctx, initialVolumes.master / 100);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 12;
  comp.ratio.value = 3;
  comp.attack.value = 0.01;
  comp.release.value = 0.25;
  // ...and a fast, hard limiter after it so a full mix never clips (every
  // channel at 100% rendered peaks of 1.24 before this).
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.12;
  master.connect(comp).connect(limiter).connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx, 2.8, 3.2);
  const reverbOut = gainNode(ctx, 0.8);
  reverb.connect(reverbOut).connect(master);

  const levels = {} as Record<ChannelId, number>;
  const gains = {} as Record<ChannelId, GainNode>;
  for (const id of CHANNEL_IDS) {
    levels[id] = initialVolumes[id] / 100;
    const g = gainNode(ctx, Math.pow(levels[id], 1.6));
    g.connect(master);
    g.connect(gainNode(ctx, REVERB_SEND[id])).connect(reverb);
    gains[id] = g;
  }

  let trackId = LOFI_TRACKS.some(t => t.id === options.lofiTrack) ? options.lofiTrack! : DEFAULT_LOFI_TRACK;
  const getTrack = () => LOFI_TRACKS.find(t => t.id === trackId) ?? LOFI_TRACKS[0];

  const voices: Record<ChannelId, Voice> = {
    rain: createRain(ctx, gains.rain),
    wind: createWind(ctx, gains.wind),
    birds: createBirds(ctx, gains.birds),
    lofi: createLofi(ctx, gains.lofi, lofiSample, getTrack),
    thunder: createThunder(ctx, gains.thunder, () => levels.rain),
  };

  const scheduleWindow = (from: number, to: number) => {
    for (const id of CHANNEL_IDS) {
      // Silent channels schedule nothing: no nodes are created for them.
      if (levels[id] > 0.001) voices[id].schedule(from, to);
    }
  };

  // Look-ahead scheduler: every 50 ms, book events up to 0.3 s ahead (2 s
  // while the tab is hidden, when browsers throttle timers to ~1 Hz).
  let scheduledTo = ctx.currentTime;
  let timer: ReturnType<typeof setInterval> | null = null;
  if (realtime) {
    const tick = () => {
      const now = ctx.currentTime;
      const ahead = typeof document !== 'undefined' && document.hidden ? 2 : 0.3;
      const to = now + ahead;
      if (to <= scheduledTo) return;
      scheduleWindow(Math.max(scheduledTo, now), to);
      scheduledTo = to;
    };
    timer = setInterval(tick, 50);
    tick();
  }

  return {
    context: ctx,
    setChannelGain(id, value01, rampSeconds = 0.25) {
      const g = gains[id];
      if (!g) return;
      levels[id] = value01;
      g.gain.setTargetAtTime(Math.pow(value01, 1.6), ctx.currentTime, rampSeconds);
    },
    setMasterGain(value01, rampSeconds = 0.25) {
      master.gain.setTargetAtTime(value01, ctx.currentTime, rampSeconds);
    },
    setLofiTrack(id) {
      if (LOFI_TRACKS.some(t => t.id === id)) trackId = id;
    },
    scheduleWindow,
    dispose() {
      if (timer) clearInterval(timer);
      CHANNEL_IDS.forEach(id => voices[id].dispose());
      master.disconnect();
    },
  };
}

/**
 * Renders the ambience offline — no speaker, no real time. Used by the tests
 * to measure levels and catch clipping or silence in any layer.
 */
export async function renderAmbience(
  seconds: number,
  volumes: Record<ChannelId | 'master', number>,
  lofiTrack?: string,
  sampleRate = 22050
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const engine = createAmbienceEngine(ctx, volumes, null, { lofiTrack, realtime: false });
  engine.scheduleWindow(0, seconds);
  return ctx.startRendering();
}

// ----------------------------------------------------------------- presets

export interface AmbiencePreset {
  id: string;
  label: string;
  volumes: Record<ChannelId, number>;
  lofiTrack?: string;
}

export const AMBIENCE_PRESETS: AmbiencePreset[] = [
  { id: 'focus', label: 'Focus', volumes: { lofi: 70, rain: 30, wind: 0, birds: 0, thunder: 0 }, lofiTrack: 'sunday' },
  { id: 'cafe', label: 'Rainy café', volumes: { lofi: 60, rain: 55, wind: 10, birds: 0, thunder: 15 }, lofiTrack: 'cafe' },
  { id: 'meadow', label: 'Meadow', volumes: { lofi: 0, rain: 0, wind: 40, birds: 75, thunder: 0 } },
  { id: 'storm', label: 'Thunderstorm', volumes: { lofi: 0, rain: 85, wind: 55, birds: 0, thunder: 80 } },
  { id: 'night', label: 'Night drive', volumes: { lofi: 65, rain: 20, wind: 20, birds: 0, thunder: 0 }, lofiTrack: 'night' },
  { id: 'garden', label: 'Garden party', volumes: { lofi: 55, rain: 0, wind: 20, birds: 45, thunder: 0 }, lofiTrack: 'garden' },
];
