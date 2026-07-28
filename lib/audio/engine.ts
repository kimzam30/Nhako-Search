/**
 * Procedural ambience engine.
 *
 * Everything here is synthesised live with Web Audio rather than streamed from
 * files. The previous assets were 2-4 second WAVs mislabelled as MP3 (1.2 MB
 * for 14 seconds of content, with an audible seam every loop, and a "thunder"
 * file that was byte-identical to "rain"). Generating instead means zero
 * bandwidth, no licensing questions, no seams, and endless variation.
 *
 * The lofi channel can optionally use a real recording — see loadLofiSample.
 */

export type ChannelId = 'lofi' | 'rain' | 'wind' | 'birds' | 'thunder';

export const CHANNEL_IDS: ChannelId[] = ['lofi', 'rain', 'wind', 'birds', 'thunder'];

/** A running sound source that can be torn down. */
interface Voice {
  dispose(): void;
}

// ---------------------------------------------------------------- utilities

function noiseBuffer(ctx: BaseAudioContext, seconds: number, pink: boolean): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (!pink) {
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // Paul Kellet's pink-noise approximation. Pink sits much closer to natural
  // rain/wind than the flat white noise the old assets used.
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

function loopingNoise(ctx: AudioContext, seconds: number, pink: boolean): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, seconds, pink);
  src.loop = true;
  // Start at a random offset so layers never phase-lock into a pattern.
  return src;
}

function filter(
  ctx: AudioContext,
  type: BiquadFilterType,
  frequency: number,
  q?: number
): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  if (q !== undefined) f.Q.value = q;
  return f;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// -------------------------------------------------------------------- rain

function createRain(ctx: AudioContext, dest: AudioNode): Voice {
  const out = ctx.createGain();
  out.connect(dest);

  // Main body: pink noise band-limited to the hiss of falling water.
  const body = loopingNoise(ctx, 6, true);
  const hp = filter(ctx, 'highpass', 440);
  const lp = filter(ctx, 'lowpass', 7200);
  const bodyGain = ctx.createGain();
  bodyGain.gain.value = 0.9;
  body.connect(hp).connect(lp).connect(bodyGain).connect(out);

  // Low layer: the rumble of rain on a roof.
  const low = loopingNoise(ctx, 5, true);
  const lowLp = filter(ctx, 'lowpass', 380);
  const lowGain = ctx.createGain();
  lowGain.gain.value = 0.35;
  low.connect(lowLp).connect(lowGain).connect(out);

  body.start(0, randomBetween(0, 5));
  low.start(0, randomBetween(0, 4));

  // Slow "gusts" so the intensity breathes instead of sitting flat.
  const gustTimer = setInterval(() => {
    const now = ctx.currentTime;
    bodyGain.gain.setTargetAtTime(randomBetween(0.65, 1.1), now, 2.5);
    lowLp.frequency.setTargetAtTime(randomBetween(300, 520), now, 3);
  }, 4000);

  return {
    dispose() {
      clearInterval(gustTimer);
      try { body.stop(); low.stop(); } catch { /* already stopped */ }
      out.disconnect();
    },
  };
}

// -------------------------------------------------------------------- wind

function createWind(ctx: AudioContext, dest: AudioNode): Voice {
  const out = ctx.createGain();
  out.connect(dest);

  const src = loopingNoise(ctx, 6, true);
  const band = filter(ctx, 'bandpass', 480, 1.2);
  const shaper = ctx.createGain();
  shaper.gain.value = 0.6;
  src.connect(band).connect(shaper).connect(out);
  src.start(0, randomBetween(0, 5));

  // Two slow LFOs: one sweeps the resonant peak, one swells the level.
  const freqLfo = ctx.createOscillator();
  freqLfo.frequency.value = 0.07;
  const freqDepth = ctx.createGain();
  freqDepth.gain.value = 260;
  freqLfo.connect(freqDepth).connect(band.frequency);
  freqLfo.start();

  const ampLfo = ctx.createOscillator();
  ampLfo.frequency.value = 0.11;
  const ampDepth = ctx.createGain();
  ampDepth.gain.value = 0.32;
  ampLfo.connect(ampDepth).connect(shaper.gain);
  ampLfo.start();

  return {
    dispose() {
      try { src.stop(); freqLfo.stop(); ampLfo.stop(); } catch { /* already stopped */ }
      out.disconnect();
    },
  };
}

// ------------------------------------------------------------------- birds

/** One chirp: a short pitch-swept tone with a soft attack. */
function chirp(ctx: AudioContext, dest: AudioNode, at: number) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';

  const base = randomBetween(2100, 4200);
  const sweep = randomBetween(300, 1400) * (Math.random() < 0.35 ? -1 : 1);
  const dur = randomBetween(0.06, 0.16);

  osc.frequency.setValueAtTime(base, at);
  osc.frequency.linearRampToValueAtTime(base + sweep, at + dur);

  // A touch of second harmonic keeps it from sounding like a test tone.
  const partial = ctx.createOscillator();
  partial.type = 'triangle';
  partial.frequency.setValueAtTime(base * 2, at);
  partial.frequency.linearRampToValueAtTime((base + sweep) * 2, at + dur);
  const partialGain = ctx.createGain();
  partialGain.gain.value = 0.12;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(randomBetween(0.35, 0.7), at + dur * 0.25);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);

  osc.connect(env);
  partial.connect(partialGain).connect(env);
  env.connect(dest);

  osc.start(at);
  partial.start(at);
  osc.stop(at + dur + 0.02);
  partial.stop(at + dur + 0.02);
}

function createBirds(ctx: AudioContext, dest: AudioNode): Voice {
  const out = ctx.createGain();
  out.gain.value = 0.5;
  // Gentle high-pass keeps chirps sitting above the rain rather than inside it.
  const shape = filter(ctx, 'highpass', 1200);
  out.connect(shape).connect(dest);

  const timer = setInterval(() => {
    // Birds call in bursts, not on a metronome.
    const burst = Math.floor(randomBetween(1, 4));
    let t = ctx.currentTime + randomBetween(0, 0.4);
    for (let i = 0; i < burst; i++) {
      chirp(ctx, out, t);
      t += randomBetween(0.12, 0.3);
    }
  }, 2600);

  return {
    dispose() {
      clearInterval(timer);
      out.disconnect();
      shape.disconnect();
    },
  };
}

// ----------------------------------------------------------------- thunder

/**
 * A thunder clap: a noise burst pushed through a lowpass that sweeps downward,
 * with a couple of secondary cracks so it rolls rather than thuds.
 */
function thunderClap(ctx: AudioContext, dest: AudioNode) {
  const now = ctx.currentTime;
  const duration = randomBetween(2.6, 5.2);
  const distance = Math.random(); // 0 = overhead crack, 1 = distant rumble

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, duration, true);

  const lp = filter(ctx, 'lowpass', 900 - distance * 600, 1.1);
  lp.frequency.setValueAtTime(900 - distance * 600, now);
  lp.frequency.exponentialRampToValueAtTime(90 + (1 - distance) * 120, now + duration);

  const env = ctx.createGain();
  const peak = 0.55 + (1 - distance) * 0.45;
  env.gain.setValueAtTime(0.0001, now);
  // A near strike cracks; a distant one swells.
  const attack = 0.004 + distance * 0.5;
  env.gain.exponentialRampToValueAtTime(peak, now + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  src.connect(lp).connect(env).connect(dest);
  src.start(now);
  src.stop(now + duration + 0.05);

  // Secondary rumbles rolling in behind the initial strike.
  const rolls = Math.floor(randomBetween(1, 3));
  for (let i = 0; i < rolls; i++) {
    const at = now + randomBetween(0.4, duration * 0.6);
    const rollDur = randomBetween(0.8, 2.0);
    const roll = ctx.createBufferSource();
    roll.buffer = noiseBuffer(ctx, rollDur, true);
    const rollLp = filter(ctx, 'lowpass', randomBetween(120, 320));
    const rollEnv = ctx.createGain();
    rollEnv.gain.setValueAtTime(0.0001, at);
    rollEnv.gain.exponentialRampToValueAtTime(peak * randomBetween(0.2, 0.5), at + 0.15);
    rollEnv.gain.exponentialRampToValueAtTime(0.0001, at + rollDur);
    roll.connect(rollLp).connect(rollEnv).connect(dest);
    roll.start(at);
    roll.stop(at + rollDur + 0.05);
  }
}

/**
 * Thunder is scheduled rather than looped, and its frequency follows the rain
 * level — a storm rolls, a clear sky stays quiet.
 */
function createThunder(
  ctx: AudioContext,
  dest: AudioNode,
  getRainLevel: () => number
): Voice {
  let timer: ReturnType<typeof setTimeout>;

  const schedule = () => {
    const rain = Math.min(1, Math.max(0, getRainLevel()));
    // Heavy rain -> roughly every 18s. No rain -> rare, distant weather.
    const meanGap = 90000 - rain * 72000;
    const delay = randomBetween(meanGap * 0.5, meanGap * 1.5);
    timer = setTimeout(() => {
      thunderClap(ctx, dest);
      schedule();
    }, delay);
  };
  schedule();

  return {
    dispose() {
      clearTimeout(timer);
    },
  };
}

// -------------------------------------------------------------------- lofi

const LOFI_ROOT = 55; // A1
const SEMITONE = Math.pow(2, 1 / 12);
const hz = (semitonesAboveRoot: number) => LOFI_ROOT * Math.pow(SEMITONE, semitonesAboveRoot);

/** ii - V - I - vi in a major key: the standard warm, unresolved lofi loop. */
const LOFI_PROGRESSION = [
  [14, 17, 21, 24], // ii7
  [19, 23, 26, 29], // V7
  [12, 16, 19, 23], // Imaj7
  [21, 24, 28, 31], // vi7
];

function createLofi(ctx: AudioContext, dest: AudioNode, sample: AudioBuffer | null): Voice {
  const out = ctx.createGain();
  // Warmth: roll off the top like a cassette.
  const warmth = filter(ctx, 'lowpass', 2600, 0.7);
  out.connect(warmth).connect(dest);

  // If a real recording was supplied, prefer it and skip generation entirely.
  if (sample) {
    const src = ctx.createBufferSource();
    src.buffer = sample;
    src.loop = true;
    src.connect(out);
    src.start(0);
    return {
      dispose() {
        try { src.stop(); } catch { /* already stopped */ }
        out.disconnect();
      },
    };
  }

  // Vinyl crackle underneath the chords.
  const crackle = loopingNoise(ctx, 8, false);
  const crackleFilter = filter(ctx, 'highpass', 3000);
  const crackleGain = ctx.createGain();
  crackleGain.gain.value = 0.012;
  crackle.connect(crackleFilter).connect(crackleGain).connect(out);
  crackle.start(0, randomBetween(0, 7));

  const chordGain = ctx.createGain();
  chordGain.gain.value = 0.16;
  chordGain.connect(out);

  let step = 0;
  const BAR_SECONDS = 3.4; // ~70bpm feel

  const playChord = () => {
    const at = ctx.currentTime + 0.05;
    const chord = LOFI_PROGRESSION[step % LOFI_PROGRESSION.length];
    step++;

    chord.forEach((semi, i) => {
      const osc = ctx.createOscillator();
      // Triangle reads as a soft electric piano once filtered.
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = hz(semi) * randomBetween(0.998, 1.002); // slight detune
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, at);
      env.gain.linearRampToValueAtTime(i === 0 ? 0.5 : 0.28, at + 0.25);
      env.gain.setTargetAtTime(0, at + BAR_SECONDS * 0.55, 0.7);
      osc.connect(env).connect(chordGain);
      osc.start(at);
      osc.stop(at + BAR_SECONDS + 0.5);
    });

    // An occasional melody note drifting over the top.
    if (Math.random() < 0.6) {
      const noteAt = at + randomBetween(0.3, BAR_SECONDS * 0.6);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = hz(chord[Math.floor(Math.random() * chord.length)] + 12);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, noteAt);
      env.gain.linearRampToValueAtTime(0.14, noteAt + 0.08);
      env.gain.setTargetAtTime(0, noteAt + 0.3, 0.35);
      osc.connect(env).connect(chordGain);
      osc.start(noteAt);
      osc.stop(noteAt + 1.6);
    }
  };

  playChord();
  const timer = setInterval(playChord, BAR_SECONDS * 1000);

  return {
    dispose() {
      clearInterval(timer);
      try { crackle.stop(); } catch { /* already stopped */ }
      out.disconnect();
    },
  };
}

/**
 * Optional real lofi recording.
 *
 * Null by default so no request is made at all — the generated chords are the
 * shipped behaviour. Set this to '/audio/lofi.mp3' (and add the file) to use a
 * recording instead; it falls back to generation if the fetch or decode fails.
 */
export const LOFI_SAMPLE_URL: string | null = null;

export async function loadLofiSample(ctx: AudioContext): Promise<AudioBuffer | null> {
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
  context: AudioContext;
  setChannelGain(id: ChannelId, value01: number, rampSeconds?: number): void;
  setMasterGain(value01: number, rampSeconds?: number): void;
  dispose(): void;
}

export function createAmbienceEngine(
  ctx: AudioContext,
  initialVolumes: Record<ChannelId | 'master', number>,
  lofiSample: AudioBuffer | null
): AmbienceEngine {
  const master = ctx.createGain();
  master.gain.value = initialVolumes.master / 100;
  master.connect(ctx.destination);

  const gains = {} as Record<ChannelId, GainNode>;
  for (const id of CHANNEL_IDS) {
    const g = ctx.createGain();
    // Perceptual: volume sliders feel linear when mapped as a power curve.
    g.gain.value = Math.pow(initialVolumes[id] / 100, 1.6);
    g.connect(master);
    gains[id] = g;
  }

  const voices: Voice[] = [
    createRain(ctx, gains.rain),
    createWind(ctx, gains.wind),
    createBirds(ctx, gains.birds),
    createLofi(ctx, gains.lofi, lofiSample),
    createThunder(ctx, gains.thunder, () => Math.pow(gains.rain.gain.value, 1 / 1.6)),
  ];

  return {
    context: ctx,
    setChannelGain(id, value01, rampSeconds = 0.25) {
      const g = gains[id];
      if (!g) return;
      g.gain.setTargetAtTime(Math.pow(value01, 1.6), ctx.currentTime, rampSeconds);
    },
    setMasterGain(value01, rampSeconds = 0.25) {
      master.gain.setTargetAtTime(value01, ctx.currentTime, rampSeconds);
    },
    dispose() {
      voices.forEach(v => v.dispose());
      master.disconnect();
    },
  };
}

// ----------------------------------------------------------------- presets

export interface AmbiencePreset {
  id: string;
  label: string;
  volumes: Record<ChannelId, number>;
}

export const AMBIENCE_PRESETS: AmbiencePreset[] = [
  {
    id: 'focus',
    label: 'Focus',
    volumes: { lofi: 70, rain: 35, wind: 0, birds: 0, thunder: 0 },
  },
  {
    id: 'meadow',
    label: 'Meadow',
    volumes: { lofi: 0, rain: 0, wind: 45, birds: 70, thunder: 0 },
  },
  {
    id: 'storm',
    label: 'Thunderstorm',
    volumes: { lofi: 15, rain: 85, wind: 55, birds: 0, thunder: 70 },
  },
  {
    id: 'night',
    label: 'Quiet Night',
    volumes: { lofi: 30, rain: 20, wind: 25, birds: 0, thunder: 10 },
  },
];
