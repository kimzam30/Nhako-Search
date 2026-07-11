'use client';
import { GameClient } from '@/components/game/GameClient';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import standardWords from '@/lib/words/standard.json';
import gardenWords from '@/lib/words/garden.json';
import rainyDayWords from '@/lib/words/rainy-day.json';
import cozyCottageWords from '@/lib/words/cozy-cottage.json';
import nightSkyWords from '@/lib/words/night-sky.json';
import dateNightWords from '@/lib/words/date-night.json';

const THEME_MAP: Record<string, any> = {
  'standard': standardWords,
  'garden': gardenWords,
  'rainy-day': rainyDayWords,
  'cozy-cottage': cozyCottageWords,
  'night-sky': nightSkyWords,
  'date-night': dateNightWords
};

export default function StandardPlayPage() {
  const params = useParams();
  const theme = (params.slug?.[0] as string) || 'standard';
  const diff = (params.slug?.[1] as 'easy' | 'medium' | 'hard') || 'easy';
  
  const [seed, setSeed] = useState<string>('');
  const [words, setWords] = useState<string[]>([]);

  const generateNew = () => {
    const wordCount = diff === 'easy' ? 6 : diff === 'medium' ? 8 : 10;
    const themeData = THEME_MAP[theme] || THEME_MAP.standard;
    const pool = themeData[diff] || themeData.easy;
    
    // Read recent from session storage
    const recentJson = sessionStorage.getItem(`nhako_recent_${theme}_${diff}`) || '[]';
    let recentWords: string[] = [];
    try { recentWords = JSON.parse(recentJson); } catch (e) {}

    // Filter out recent
    const available = pool.filter((w: string) => !recentWords.includes(w));
    // Fallback if pool exhausted
    const poolToUse = available.length >= wordCount ? available : pool;

    const shuffled = [...poolToUse].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, wordCount);

    // Save back to session storage
    const newRecent = [...recentWords, ...selected].slice(-30);
    sessionStorage.setItem(`nhako_recent_${theme}_${diff}`, JSON.stringify(newRecent));

    setSeed(Math.random().toString(36).substring(2));
    setWords(selected);
  };

  useEffect(() => {
    generateNew();
  }, [theme, diff]);

  if (!seed || words.length === 0) return null;

  return (
    <div className="flex flex-col flex-1 p-4 bg-background items-center justify-center w-full mt-12">
      <div className="w-full flex justify-center items-center mb-6 max-w-lg absolute top-6">
        <h1 className="text-xl font-display text-ink/60 bg-surface px-4 py-1 rounded-full border-2 border-ink shadow-sm capitalize">{theme.replace('-', ' ')} - {diff}</h1>
      </div>
      <GameClient words={words} difficulty={diff} seedStr={seed} onNext={generateNew} />
    </div>
  );
}
