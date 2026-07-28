'use client';
import { GameClient } from '@/components/game/GameClient';
import { getDailySeed, saveDailyChallenge, checkDailyStreak, getRecentDailyHistory } from '@/lib/daily/logic';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FlameSvg, StarSvg } from '@/components/ui/Icons';
import standardPool from '@/lib/words/standard.json';

export default function DailyChallengePage() {
  const [streakData, setStreakData] = useState({ streak: 0, playedToday: false, history: [] as boolean[] });
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    // Real play history, so the strip can show actual gaps.
    Promise.all([checkDailyStreak(), getRecentDailyHistory(7)]).then(([data, history]) => {
      setStreakData({ ...data, history });
      setLoading(false);
    });
  }, []);

  const handleComplete = async (stars: number, time: number) => {
    await saveDailyChallenge();
    const [data, history] = await Promise.all([checkDailyStreak(), getRecentDailyHistory(7)]);
    setStreakData({ ...data, history });
    setPlaying(false);
  };

  if (loading) return <div className="p-4 flex justify-center w-full min-h-screen items-center font-display text-2xl text-ink">Loading...</div>;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  if (streakData.playedToday && !playing) {
    return (
      <div className="flex flex-col flex-1 p-6 bg-background items-center justify-center w-full max-w-lg mx-auto pb-20">
        <h1 className="text-4xl font-display text-ink mb-2 text-center">Daily Challenge</h1>
        <p className="font-accent text-ink/70 text-2xl mb-8 -rotate-2">{today}</p>
        
        <Card className="flex flex-col gap-6 text-center items-center justify-center py-10 w-full mb-8">
          <h2 className="text-2xl font-display text-ink">Puzzle Completed!</h2>
          
          <div className="flex gap-2 mb-2">
             {Array.from({length: 3}).map((_, i) => (
                <StarSvg key={i} className="text-gold w-10 h-10 drop-shadow-sm" filled />
             ))}
          </div>

          <div className="flex items-center gap-2 bg-surface border-2 border-ink px-4 py-2 rounded-xl">
            <FlameSvg className="w-6 h-6 text-accent" />
            <span className="font-display font-bold text-ink text-xl">{streakData.streak} Day Streak</span>
          </div>
          
          <p className="text-ink/60 font-body mt-2">Come back tomorrow for a new puzzle.</p>
        </Card>

        <Link href="/" className="w-full">
          <Button variant="secondary" fullWidth className="py-4 text-xl">
            Back Home
          </Button>
        </Link>
      </div>
    );
  }

  if (!playing) {
    return (
      <div className="flex flex-col flex-1 p-6 bg-background items-center justify-center w-full max-w-lg mx-auto pb-20">
        <h1 className="text-4xl font-display text-ink mb-2 text-center">Daily Challenge</h1>
        <p className="font-accent text-ink/70 text-2xl mb-8 -rotate-2">{today}</p>
        
        <Card className="flex flex-col gap-6 text-center items-center py-8 w-full mb-8 bg-accent-soft">
          <div className="flex items-center gap-2 mb-4">
            <FlameSvg className="w-10 h-10 text-accent" />
            <span className="font-display font-bold text-ink text-3xl">{streakData.streak}</span>
          </div>
          
          {/* Calendar Strip */}
          <div className="flex gap-2">
            {streakData.history.map((played, i) => (
              <div 
                key={i} 
                className={`w-4 h-4 rounded-full border-2 ${played ? 'bg-accent border-ink' : 'bg-surface border-ink/20'}`} 
              />
            ))}
          </div>
          <p className="text-xs font-bold text-ink/60 uppercase tracking-widest mt-2">Last 7 Days</p>
        </Card>

        <Button variant="primary" fullWidth onClick={() => setPlaying(true)} className="py-4 text-xl mb-4">
          Play Today's Puzzle
        </Button>
        
        <Link href="/" className="w-full">
          <Button variant="secondary" fullWidth className="border-ink/20 hover:bg-surface">
            Not Right Now
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-background items-center w-full mt-12 pb-20">
      <div className="w-full flex justify-between items-center mb-6 max-w-lg px-4 absolute top-6">
        <h1 className="text-2xl font-display text-ink/80 bg-surface px-4 py-1 rounded-full border-2 border-ink shadow-sm">Daily</h1>
        <div className="flex items-center gap-1 bg-surface px-3 py-1 rounded-full border-2 border-ink shadow-sm">
          <FlameSvg className="w-4 h-4 text-accent" />
          <span className="font-bold text-ink font-body">{streakData.streak}</span>
        </div>
      </div>
      
      <div className="pt-8 w-full h-full">
        <GameClient 
          words={standardPool.medium} 
          difficulty="medium" 
          seedStr={getDailySeed()}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
