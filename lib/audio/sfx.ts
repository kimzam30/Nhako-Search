/**
 * Game sound effects.
 *
 * Synthesised like the ambience, so they add no download weight. Finding a word
 * previously produced no feedback at all — no sound, no haptic, nothing.
 */

export type EffectName = 'found' | 'miss' | 'hint' | 'win';

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
  env.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.02, duration * 0.2));
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  osc.connect(env).connect(dest);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

export function playEffect(ctx: AudioContext, dest: AudioNode, name: EffectName) {
  const now = ctx.currentTime + 0.001;

  switch (name) {
    case 'found': {
      // Rising perfect fifth — reads as "yes" without being shrill.
      tone(ctx, dest, now, 660, 0.16, 0.28);
      tone(ctx, dest, now + 0.07, 990, 0.22, 0.22);
      break;
    }
    case 'miss': {
      // Low, short, and quiet: acknowledges the attempt without scolding.
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.14);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, now);
      env.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.connect(env).connect(dest);
      osc.start(now);
      osc.stop(now + 0.18);
      break;
    }
    case 'hint': {
      tone(ctx, dest, now, 1320, 0.1, 0.14);
      tone(ctx, dest, now + 0.06, 1760, 0.12, 0.1);
      break;
    }
    case 'win': {
      // Major arpeggio.
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        tone(ctx, dest, now + i * 0.09, f, 0.5, 0.22, i === 3 ? 'triangle' : 'sine');
      });
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
