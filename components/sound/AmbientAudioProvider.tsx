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
  
  const tracksRef = useRef<Record<Exclude<keyof AudioVolumes, 'master'>, HTMLAudioElement | null>>({
    lofi: null,
    rain: null,
    wind: null,
    birds: null,
  });

  useEffect(() => {
    // Load from local storage
    const saved = localStorage.getItem('nhako_audio_volumes');
    if (saved) {
      try {
        setVolumes(JSON.parse(saved));
      } catch (e) {}
    }
    
    // Initialize audio elements
    const createTrack = (src: string) => {
      const audio = new Audio(src);
      audio.loop = true;
      return audio;
    };

    tracksRef.current.lofi = createTrack('/audio/lofi.mp3');
    tracksRef.current.rain = createTrack('/audio/rain.mp3');
    tracksRef.current.wind = createTrack('/audio/wind.mp3');
    tracksRef.current.birds = createTrack('/audio/birds.mp3');
    
    setIsReady(true);
    
    return () => {
      Object.values(tracksRef.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    
    // Update volumes on the actual audio elements
    const masterMult = volumes.master / 100;
    
    const applyVolume = (key: keyof typeof tracksRef.current) => {
      const audio = tracksRef.current[key];
      if (audio) {
        audio.volume = (volumes[key] / 100) * masterMult;
        if (isPlaying && volumes[key] > 0 && audio.paused) {
          audio.play().catch(e => console.error("Audio play failed:", e));
        } else if ((!isPlaying || volumes[key] === 0) && !audio.paused) {
          audio.pause();
        }
      }
    };

    applyVolume('lofi');
    applyVolume('rain');
    applyVolume('wind');
    applyVolume('birds');
    
    localStorage.setItem('nhako_audio_volumes', JSON.stringify(volumes));
  }, [volumes, isPlaying, isReady]);

  const setVolume = (track: keyof AudioVolumes, value: number) => {
    setVolumes(prev => ({ ...prev, [track]: value }));
  };

  const startAmbience = () => {
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
