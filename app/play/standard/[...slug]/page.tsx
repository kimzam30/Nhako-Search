'use client';
import { GameClient } from '@/components/game/GameClient';
import { useEffect, useState } from 'react';
import standardWords from '@/lib/words/standard.json';
import { useParams } from 'next/navigation';

export default function StandardPlayPage() {
  const params = useParams();
  const diff = (params.slug?.[0] as 'easy' | 'medium' | 'hard') || 'easy';
  const [seed, setSeed] = useState<string>('');
  const [words, setWords] = useState<string[]>([]);

  const generateNew = () => {
    const wordCount = diff === 'easy' ? 6 : diff === 'medium' ? 8 : 10;
    const pool = (standardWords as any)[diff] || standardWords.easy;
    
    // Read recent from session storage
    const recentJson = sessionStorage.getItem('nhako_recent_words') || '[]';
    let recentWords: string[] = [];
    try { recentWords = JSON.parse(recentJson); } catch (e) {}

    // Filter out recent
    const available = pool.filter((w: string) => !recentWords.includes(w));
    // Fallback if pool exhausted
    const poolToUse = available.length >= wordCount ? available : pool;

    const shuffled = [...poolToUse].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, wordCount);

    // Save back to session storage
    const newRecent = [...recentWords, ...selected].slice(-30); // keep last 30 words (approx 3-5 sets)
    sessionStorage.setItem('nhako_recent_words', JSON.stringify(newRecent));

    setSeed(Math.random().toString(36).substring(2));
    setWords(selected);
  };

  useEffect(() => {
    generateNew();
  }, [diff]);

  if (!seed || words.length === 0) return null;

  return (
    <div className="flex flex-col flex-1 p-4 bg-background items-center justify-center">
      <div className="w-full flex justify-between items-center mb-6 max-w-lg">
        <h1 className="text-2xl font-display text-ink capitalize">Standard Mode - {diff}</h1>
      </div>
      <GameClient words={words} difficulty={diff} seedStr={seed} onNext={generateNew} />
    </div>
  );
}
