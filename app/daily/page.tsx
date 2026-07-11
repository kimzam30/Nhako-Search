'use client';
import { GameClient } from '@/components/game/GameClient';
import { getDailySeed, saveDailyChallenge, checkDailyStreak } from '@/lib/daily/logic';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DailyChallengePage() {
  const [streakData, setStreakData] = useState({ streak: 0, playedToday: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkDailyStreak().then(data => {
      setStreakData(data);
      setLoading(false);
    });
  }, []);

  const handleComplete = async () => {
    await saveDailyChallenge();
    const data = await checkDailyStreak();
    setStreakData(data);
  };

  if (loading) return <div className="p-4 flex justify-center w-full min-h-screen text-ink">Loading...</div>;

  if (streakData.playedToday) {
    return (
      <div className="flex flex-col flex-1 p-4 bg-background items-center justify-center">
        <h1 className="text-4xl font-display text-ink mb-4 text-center">Daily Challenge</h1>
        <div className="bg-surface p-8 rounded-3xl border-4 border-ink shadow-sm text-center">
          <p className="text-xl font-body text-ink mb-4">You already completed today's puzzle!</p>
          <p className="text-2xl mb-8">🔥 {streakData.streak} Day Streak</p>
          <Link href="/" className="bg-accent text-ink font-bold py-3 px-8 rounded-xl border-2 border-ink shadow-[0_4px_0_var(--ink)] active:translate-y-1 active:shadow-none inline-block">
            Back Home
          </Link>
        </div>
      </div>
    );
  }

  const standardPool = require('@/lib/words/standard.json');
  const dailyWords = standardPool.medium;

  return (
    <div className="flex flex-col flex-1 p-4 bg-background items-center justify-center">
      <div className="w-full flex justify-between items-center mb-6 max-w-lg">
        <h1 className="text-2xl font-display text-ink">Daily Challenge</h1>
        <span className="font-bold text-ink">🔥 Streak: {streakData.streak}</span>
      </div>
      <GameClient 
        words={dailyWords} 
        difficulty="medium" 
        seedStr={getDailySeed()}
        onComplete={handleComplete}
        nextLevelHref="/"
      />
    </div>
  );
}
