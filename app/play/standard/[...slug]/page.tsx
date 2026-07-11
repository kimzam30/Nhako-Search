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

  useEffect(() => {
    setSeed(Math.random().toString(36).substring(2));
    const pool = (standardWords as any)[diff] || standardWords.easy;
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    setWords(shuffled.slice(0, 8));
  }, [diff]);

  if (!seed || words.length === 0) return null;

  return (
    <div className="flex flex-col flex-1 p-4 bg-background items-center justify-center">
      <div className="w-full flex justify-between items-center mb-6 max-w-lg">
        <h1 className="text-2xl font-display text-ink capitalize">Standard Mode - {diff}</h1>
      </div>
      <GameClient words={words} difficulty={diff} seedStr={seed} />
    </div>
  );
}
