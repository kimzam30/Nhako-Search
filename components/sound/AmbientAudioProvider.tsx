'use client';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  AMBIENCE_PRESETS,
  CHANNEL_IDS,
  createAmbienceEngine,
  loadLofiSample,
  type AmbienceEngine,
  type ChannelId,
} from '@/lib/audio/engine';
import { playEffect, type EffectName } from '@/lib/audio/sfx';

/** `sfx` is a mixer channel but not an ambience layer, so it sits outside ChannelId. */
export type AudioVolumes = Record<ChannelId | 'master' | 'sfx', number>;

interface AmbientAudioContextType {
  volumes: AudioVolumes;
  setVolume: (track: keyof AudioVolumes, value: number) => void;
  isPlaying: boolean;
  /** True once the engine has been built (first user gesture). */
  isReady: boolean;
  startAmbience: () => Promise<void>;
  stopAmbience: () => void;
  applyPreset: (presetId: string) => void;
  presets: typeof AMBIENCE_PRESETS;
  /** Game feedback. Works whether or not the ambience is running. */
  playSfx: (name: EffectName) => void;
}

const STORAGE_KEY = 'nhako_audio_volumes';

const defaultVolumes: AudioVolumes = {
  master: 80,
  lofi: 50,
  rain: 0,
  wind: 0,
  birds: 0,
  thunder: 0,
  sfx: 70,
};

const AmbientAudioContext = createContext<AmbientAudioContextType | null>(null);

function readStoredVolumes(): AudioVolumes {
  if (typeof window === 'undefined') return defaultVolumes;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultVolumes;
    const parsed = JSON.parse(raw) as Partial<AudioVolumes>;
    // Merge rather than replace: an older payload is missing newer channels.
    const merged = { ...defaultVolumes };
    for (const key of Object.keys(merged) as (keyof AudioVolumes)[]) {
      const v = parsed[key];
      if (typeof v === 'number' && Number.isFinite(v)) {
        merged[key] = Math.min(100, Math.max(0, v));
      }
    }
    return merged;
  } catch {
    return defaultVolumes;
  }
}

export function AmbientAudioProvider({ children }: { children: React.ReactNode }) {
  const [volumes, setVolumes] = useState<AudioVolumes>(defaultVolumes);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const engineRef = useRef<AmbienceEngine | null>(null);
  const startingRef = useRef(false);
  /*
   * Game sounds get their own context. They used to share the ambience one,
   * so resuming it for a single "miss" also restarted music the player had
   * just paused, while the mixer still said OFF.
   */
  const sfxCtxRef = useRef<AudioContext | null>(null);
  const sfxGainRef = useRef<GainNode | null>(null);
  const volumesRef = useRef<AudioVolumes>(defaultVolumes);

  const newContext = (): AudioContext | null => {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return AudioContextClass ? new AudioContextClass() : null;
  };

  /** The ambience context, created on the first gesture that needs it. */
  const ensureContext = useCallback((): AudioContext | null => {
    if (!ctxRef.current) ctxRef.current = newContext();
    return ctxRef.current;
  }, []);

  /**
   * The effects context. Game interactions are user gestures, so effects can
   * play even if the player never started the ambience.
   */
  const ensureSfxContext = useCallback((): AudioContext | null => {
    if (sfxCtxRef.current) return sfxCtxRef.current;
    const ctx = newContext();
    if (!ctx) return null;
    const sfxGain = ctx.createGain();
    sfxGain.gain.value = (volumesRef.current.sfx / 100) * (volumesRef.current.master / 100);
    sfxGain.connect(ctx.destination);
    sfxCtxRef.current = ctx;
    sfxGainRef.current = sfxGain;
    return ctx;
  }, []);

  const playSfx = useCallback(
    (name: EffectName) => {
      if (volumesRef.current.sfx <= 0 || volumesRef.current.master <= 0) return;
      const ctx = ensureSfxContext();
      const dest = sfxGainRef.current;
      if (!ctx || !dest) return;
      // A suspended context would swallow the effect silently.
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      playEffect(ctx, dest, name);
    },
    [ensureSfxContext]
  );

  useEffect(() => {
    // Hydrating from storage after mount is deliberate: reading it during the
    // first render would differ from the server HTML and break hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVolumes(readStoredVolumes());
  }, []);

  /*
   * The persist effect below also runs on mount, while state is still
   * `defaultVolumes`, and would write those defaults straight over the saved
   * mix before hydration lands — losing the user's settings on reload. Skipping
   * its first run is enough: every genuine change after that still persists.
   */
  const skipFirstPersist = useRef(true);

  // Persist, and push every change into the running graph.
  useEffect(() => {
    volumesRef.current = volumes;
    if (sfxGainRef.current && sfxCtxRef.current) {
      sfxGainRef.current.gain.setTargetAtTime(
        (volumes.sfx / 100) * (volumes.master / 100),
        sfxCtxRef.current.currentTime,
        0.05
      );
    }
    const engine = engineRef.current;
    if (engine) {
      engine.setMasterGain(volumes.master / 100);
      for (const id of CHANNEL_IDS) engine.setChannelGain(id, volumes[id] / 100);
    }
    // See skipFirstPersist above.
    if (skipFirstPersist.current) {
      skipFirstPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(volumes));
    } catch {
      /* private mode, quota — not worth surfacing */
    }
  }, [volumes]);

  const startAmbience = useCallback(async () => {
    if (startingRef.current) return;

    // Build the graph on the first gesture; autoplay policy blocks it earlier.
    if (!engineRef.current) {
      startingRef.current = true;
      try {
        const ctx = ensureContext();
        if (!ctx) return;

        // Optional real recording; falls back to generated chords when absent.
        const lofiSample = await loadLofiSample(ctx);
        engineRef.current = createAmbienceEngine(ctx, volumes, lofiSample);
        setIsReady(true);
      } finally {
        startingRef.current = false;
      }
    }

    const ctx = ctxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume();
    setIsPlaying(true);
  }, [volumes, ensureContext]);

  const stopAmbience = useCallback(() => {
    setIsPlaying(false);
    // Suspend rather than close. The old code closed the context in an unmount
    // cleanup and never rebuilt the graph, so any remount killed audio for the
    // rest of the session; a closed context can never be resumed.
    ctxRef.current?.suspend().catch(() => {});
  }, []);

  // Browsers can suspend the context on their own (tab backgrounded, iOS
  // interruptions). Nudge it back on the next interaction while playing.
  useEffect(() => {
    if (!isPlaying) return;
    const resume = () => {
      const ctx = ctxRef.current;
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    };
    window.addEventListener('pointerdown', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      window.removeEventListener('pointerdown', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [isPlaying]);

  // Tear the graph down only when the provider itself goes away for good.
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      sfxCtxRef.current?.close().catch(() => {});
      sfxCtxRef.current = null;
    };
  }, []);

  const setVolume = useCallback((track: keyof AudioVolumes, value: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(value)));
    setVolumes(prev => (prev[track] === clamped ? prev : { ...prev, [track]: clamped }));
  }, []);

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = AMBIENCE_PRESETS.find(p => p.id === presetId);
      if (!preset) return;
      // One state write so the whole mix crossfades together rather than
      // stepping channel by channel.
      setVolumes(prev => ({ ...prev, ...preset.volumes }));
      if (!isPlaying) void startAmbience();
    },
    [isPlaying, startAmbience]
  );

  return (
    <AmbientAudioContext.Provider
      value={{
        volumes,
        setVolume,
        isPlaying,
        isReady,
        startAmbience,
        stopAmbience,
        applyPreset,
        presets: AMBIENCE_PRESETS,
        playSfx,
      }}
    >
      {children}
    </AmbientAudioContext.Provider>
  );
}

export function useAmbientAudio() {
  const context = useContext(AmbientAudioContext);
  if (!context) {
    throw new Error('useAmbientAudio must be used within an AmbientAudioProvider');
  }
  return context;
}
