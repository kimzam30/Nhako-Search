'use client';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

type AudioVolumes = {
  master: number;
  lofi: number;
  rain: number;
  wind: number;
  birds: number;
};

interface AmbientAudioContextType {
  volumes: AudioVolumes;
  setVolume: (track: keyof AudioVolumes, value: number) => void;
  isPlaying: boolean;
  startAmbience: () => void;
  stopAmbience: () => void;
}

const defaultVolumes: AudioVolumes = {
  master: 100,
  lofi: 50,
  rain: 0,
  wind: 0,
  birds: 0,
};

const AmbientAudioContext = createContext<AmbientAudioContextType | null>(null);

export function AmbientAudioProvider({ children }: { children: React.ReactNode }) {
  const [volumes, setVolumes] = useState<AudioVolumes>(defaultVolumes);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const gainsRef = useRef<Record<Exclude<keyof AudioVolumes, 'master'>, GainNode | null>>({
    lofi: null,
    rain: null,
    wind: null,
    birds: null,
  });
  
  const thunderGainRef = useRef<GainNode | null>(null);
  const thunderBufferRef = useRef<AudioBuffer | null>(null);
  
  // We keep track of the source nodes in case we need to stop them on unmount
  const sourcesRef = useRef<Record<Exclude<keyof AudioVolumes, 'master'>, AudioBufferSourceNode | null>>({
    lofi: null,
    rain: null,
    wind: null,
    birds: null,
  });

  // Load saved volumes on mount
  useEffect(() => {
    const saved = localStorage.getItem('nhako_audio_volumes');
    if (saved) {
      try {
        setVolumes(JSON.parse(saved));
      } catch (e) {}
    }
    setIsReady(true);
    
    return () => {
      // Cleanup Web Audio API resources on unmount
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(console.error);
      }
    };
  }, []);

  const initAudio = async () => {
    if (audioCtxRef.current) return;
    
    // Fallback for older Webkit
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.value = volumes.master / 100;
    masterGainRef.current = masterGain;

    const loadTrack = async (trackName: Exclude<keyof AudioVolumes, 'master'>, url: string) => {
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to fetch ${url}`);
        const arrayBuffer = await resp.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        const gainNode = ctx.createGain();
        gainNode.gain.value = volumes[trackName] / 100;
        gainNode.connect(masterGain);
        gainsRef.current[trackName] = gainNode;

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;
        source.connect(gainNode);
        source.start(0);
        sourcesRef.current[trackName] = source;
      } catch (err) {
        console.error(`Failed to load ambient track ${trackName}:`, err);
      }
    };

    const thunderGain = ctx.createGain();
    thunderGain.gain.value = volumes.rain / 100;
    thunderGain.connect(masterGain);
    thunderGainRef.current = thunderGain;

    // Load all tracks concurrently
    await Promise.all([
      loadTrack('lofi', '/audio/lofi-deep.mp3'),
      loadTrack('rain', '/audio/rain.mp3'),
      loadTrack('wind', '/audio/wind.mp3'),
      loadTrack('birds', '/audio/birds.mp3'),
      (async () => {
        try {
          const resp = await fetch('/audio/thunder.mp3');
          if (resp.ok) thunderBufferRef.current = await ctx.decodeAudioData(await resp.arrayBuffer());
        } catch (e) { console.error('Failed to load thunder'); }
      })()
    ]);
  };

  // Update volumes when state changes
  useEffect(() => {
    if (!audioCtxRef.current || !masterGainRef.current) return;
    
    const now = audioCtxRef.current.currentTime;
    
    // Update master volume with a slight ramp to prevent clicks
    masterGainRef.current.gain.setTargetAtTime(volumes.master / 100, now, 0.05);

    // Update individual track volumes
    (['lofi', 'rain', 'wind', 'birds'] as const).forEach(track => {
      const gainNode = gainsRef.current[track];
      if (gainNode) {
        gainNode.gain.setTargetAtTime(volumes[track] / 100, now, 0.05);
      }
    });
    
    if (thunderGainRef.current) {
      thunderGainRef.current.gain.setTargetAtTime(volumes.rain / 100, now, 0.05);
    }
    
    localStorage.setItem('nhako_audio_volumes', JSON.stringify(volumes));
  }, [volumes]);

  // Handle play/pause state
  useEffect(() => {
    if (!audioCtxRef.current) return;
    
    if (isPlaying) {
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(console.error);
      }
    } else {
      if (audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend().catch(console.error);
      }
    }
  }, [isPlaying]);

  // Thunder random interval
  useEffect(() => {
    if (!isPlaying) return;
    let timeoutId: NodeJS.Timeout;

    const playThunder = () => {
      if (audioCtxRef.current && thunderBufferRef.current && thunderGainRef.current) {
         const source = audioCtxRef.current.createBufferSource();
         source.buffer = thunderBufferRef.current;
         source.connect(thunderGainRef.current);
         source.start(0);
      }
      
      const nextInterval = Math.random() * 30000 + 15000;
      timeoutId = setTimeout(playThunder, nextInterval);
    };

    const initialInterval = Math.random() * 20000 + 10000;
    timeoutId = setTimeout(playThunder, initialInterval);

    return () => clearTimeout(timeoutId);
  }, [isPlaying]);

  const setVolume = (track: keyof AudioVolumes, value: number) => {
    setVolumes(prev => ({ ...prev, [track]: value }));
  };

  const startAmbience = async () => {
    if (!audioCtxRef.current) {
      await initAudio();
    }
    setIsPlaying(true);
  };

  const stopAmbience = () => {
    setIsPlaying(false);
  };

  return (
    <AmbientAudioContext.Provider value={{ volumes, setVolume, isPlaying, startAmbience, stopAmbience }}>
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
