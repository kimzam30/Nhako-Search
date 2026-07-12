'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRaceRoom } from '@/lib/multiplayer/useRaceRoom';
import { GameClient } from '@/components/game/GameClient';
import { motion, AnimatePresence } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import { ButterflyGarland } from '@/components/game/ButterflyGarland';
import { supabase } from '@/lib/multiplayer/supabase';
import { ChatSvg, ButterflySvg } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChatWidget } from '@/components/multiplayer/ChatWidget';
import { PartnerGridDisplay } from '@/components/game/PartnerGridDisplay';
import { getUserProfile } from '@/lib/auth/profile';

const QUICK_BANTER = ["GG!", "😤", "So close!", "Nice find!", "🦋", "Hurry up!"];

export default function RaceRoomPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    getUserProfile().then(profile => {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          setUserId(data.user.id);
          setUserName(profile.displayName);
        } else {
          const tempId = 'guest-' + Math.random().toString(36).substr(2, 6);
          setUserId(tempId);
          setUserName(profile.displayName);
        }
      });
    });
  }, []);

  if (!userId) return <div className="flex h-screen w-full items-center justify-center text-ink font-display text-2xl">Loading...</div>;
  return <RaceRoom activeUserId={userId} activeUserName={userName} roomCode={roomCode} />;
}

function RaceRoom({ activeUserId, activeUserName, roomCode }: { activeUserId: string, activeUserName: string, roomCode: string }) {
  const router = useRouter();
  const { raceState, updateMyState, chatMessages, sendChat, startRaceAsLeader } = useRaceRoom(roomCode, activeUserId, activeUserName);
  const isFinished = raceState.status === 'finished';
  const winner = isFinished ? (raceState.winner === activeUserId ? 'me' : 'them') : null;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const int = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(int);
  }, []);

  const me = raceState.playerA?.id === activeUserId ? raceState.playerA : raceState.playerB;
  const them = raceState.playerA?.id === activeUserId ? raceState.playerB : raceState.playerA;

  const handleDifficulty = (diff: string) => updateMyState({ difficulty: diff });
  const roomDifficulty = me?.isLeader ? me.difficulty : (them?.isLeader ? them.difficulty : 'medium');
  const raceWords = ['GARDEN', 'BUTTERFLY', 'BREEZE', 'NATURE', 'SUNSET', 'CLOUDS', 'FLOWER', 'SPRING', 'BLOSSOM', 'MEADOW'].slice(0, roomDifficulty === 'easy' ? 6 : roomDifficulty === 'medium' ? 8 : 10);

  useEffect(() => {
    if (isFinished && me && them) {
      // Only let playerA trigger the save to prevent duplicates
      const isPlayerA = raceState.playerA?.id === activeUserId;
      if (isPlayerA) {
         import('@/lib/multiplayer/history').then(({ saveRaceHistory }) => {
            const winnerId = winner === 'me' ? activeUserId : them.id;
            saveRaceHistory(activeUserId, them.id, winnerId, roomDifficulty, roomDifficulty);
         });
      }
    }
  }, [isFinished, me, them, activeUserId, raceState.playerA, winner]);

  if (raceState.status === 'lobby') {
    return (
      <div className="flex flex-col flex-1 p-4 pt-12 pb-24 bg-background items-center justify-start overflow-y-auto w-full max-w-lg mx-auto">
        <h1 className="text-4xl font-display text-ink mb-2 shrink-0">Room: {roomCode}</h1>
        <p className="font-body text-ink/70 mb-8 font-bold shrink-0">Waiting for your partner to join...</p>

        <div className="flex flex-col sm:flex-row gap-4 w-full mb-8 shrink-0">
          <Card className="flex-1 flex flex-col gap-4 text-center items-center justify-center py-6">
            <h2 className="text-xl font-bold font-display text-ink">{activeUserName} (You)</h2>
            {me?.isLeader && (
              <div className="flex flex-col gap-2 w-full">
                {['easy', 'medium', 'hard'].map(d => (
                  <button 
                    key={d} 
                    onClick={() => handleDifficulty(d)}
                    className={`py-2 rounded-xl border-2 capitalize font-body font-bold w-full transition-colors ${me?.difficulty === d ? 'bg-accent border-ink text-ink shadow-[0_2px_0_var(--ink)]' : 'bg-surface border-ink/30 text-ink/70'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
            {!me?.isLeader && (
              <div className="py-4 font-bold font-body text-ink text-lg capitalize border-2 border-ink rounded-xl bg-surface w-full">
                Diff: {roomDifficulty}
              </div>
            )}
            {me?.isLeader ? (
              <Button 
                variant="primary" 
                fullWidth 
                onClick={startRaceAsLeader}
                disabled={!them || !them.isReady}
                className="mt-4"
              >
                {them?.isReady ? 'Start Race' : 'Waiting for Partner...'}
              </Button>
            ) : (
              <Button 
                variant={me?.isReady ? 'secondary' : 'primary'} 
                fullWidth 
                onClick={() => updateMyState({ isReady: !me?.isReady })}
                className="mt-4"
              >
                {me?.isReady ? 'Ready!' : 'Ready Up'}
              </Button>
            )}
          </Card>
          
          <Card className="flex-1 flex flex-col gap-4 text-center items-center justify-center py-8 bg-surface/50 opacity-80">
            <h2 className="text-xl font-bold font-display text-ink">{them?.name || 'Waiting...'}</h2>
            {them ? (
              <>
                <div className={`w-full py-4 rounded-xl border-2 font-display text-xl bg-surface ${them.isReady ? 'text-accent border-accent bg-accent/10' : 'border-ink/30 text-ink/50'}`}>
                  {them.isReady ? 'READY' : 'NOT READY'}
                </div>
                <div className={`w-full py-2 rounded-xl font-display text-sm bg-transparent text-ink/50`}>
                  {them.isLeader ? 'LEADER' : 'GUEST'}
                </div>
              </>
            ) : (
              <div className="relative w-16 h-16 my-auto">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }} className="absolute inset-0">
                  <ButterflySvg className="w-8 h-8 text-ink/30 absolute -top-4 -left-4" />
                  <ButterflySvg className="w-6 h-6 text-ink/20 absolute -bottom-2 -right-2" />
                </motion.div>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // Countdown state
  if (raceState.status === 'countdown' && raceState.startTime) {
    const secsLeft = Math.ceil((raceState.startTime - now) / 1000);
    return (
      <div className="flex flex-col flex-1 bg-background items-center justify-center h-screen w-full">
        <motion.div 
          key={secsLeft}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          className="text-[120px] font-display text-accent drop-shadow-sm"
        >
          {secsLeft > 0 ? secsLeft : "GO!"}
        </motion.div>
      </div>
    );
  }

  // Finished state
  if (isFinished) {
    return (
      <div className="flex flex-col flex-1 p-6 bg-background items-center justify-center w-full max-w-lg mx-auto">
        <motion.h1 
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={softBounce}
          className="text-5xl font-display text-ink mb-8 text-center flex flex-col items-center gap-4"
        >
          {winner === 'me' ? 'You found more!' : `${them?.name} won!`}
          {winner === 'me' && <ButterflySvg className="w-16 h-16 text-accent" />}
        </motion.h1>

        <Card className="w-full mb-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="font-bold text-ink">You ({activeUserName})</span>
            <ButterflyGarland count={me?.progress || 0} total={me?.total || raceWords.length} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-bold text-ink">{them?.name || 'Partner'}</span>
            <ButterflyGarland count={them?.progress || 0} total={them?.total || raceWords.length} />
          </div>
        </Card>

        <div className="flex gap-4 w-full">
          <Button fullWidth variant="secondary" onClick={() => router.push('/')}>
            Back to Home
          </Button>
          <Button fullWidth variant="primary" onClick={() => window.location.reload()}>
            Rematch
          </Button>
        </div>
      </div>
    );
  }

  // Playing state
  const leaderDiff = raceState.playerA?.isLeader ? raceState.playerA.difficulty : (raceState.playerB?.isLeader ? raceState.playerB.difficulty : 'medium');
  const durationSecs = leaderDiff === 'easy' ? 180 : leaderDiff === 'medium' ? 150 : 120;
  const timeElapsed = Math.floor((now - (raceState.startTime || now)) / 1000);
  const timeLeft = Math.max(0, durationSecs - timeElapsed);
  
  return (
    <div className="flex flex-col bg-background relative w-full h-screen overflow-hidden">
       
       <div className="flex-none flex flex-col w-full max-w-lg mx-auto p-4 z-10 bg-surface border-b-2 border-ink shadow-[0_4px_0_0_var(--ink)]">
         <div className="flex justify-between items-center mb-4">
           <div className={`font-display text-xl font-bold flex-1 transition-colors ${timeLeft <= 10 ? 'text-accent animate-pulse' : 'text-ink'}`}>
             {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
           </div>
         </div>
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-4 w-full">
               <div className="flex-1">
                 <span className="text-xs font-bold text-ink uppercase tracking-wider mb-1 block">You</span>
                 <div className="w-full h-3 bg-surface border-2 border-ink rounded-full overflow-hidden relative">
                   <div className="h-full bg-gold transition-all duration-500" style={{ width: `${((me?.progress || 0) / (me?.total || 1)) * 100}%` }} />
                 </div>
               </div>
               <div className="flex-1 lg:hidden">
                 <span className="text-xs font-bold text-ink uppercase tracking-wider mb-1 block">{them?.name || 'Partner'}</span>
                 <div className="w-full h-3 bg-surface border-2 border-ink rounded-full overflow-hidden relative">
                   <div className="h-full bg-accent transition-all duration-500" style={{ width: `${((them?.progress || 0) / (them?.total || 1)) * 100}%` }} />
                 </div>
               </div>
            </div>
          </div>
       </div>

       <div className="flex-1 w-full max-w-lg lg:max-w-5xl mx-auto min-h-0 pt-4 pb-20 px-2 lg:px-8 overflow-hidden flex flex-row gap-8">
         {/* My Grid */}
         <div className="flex-1 w-full min-h-0 overflow-hidden relative">
           <GameClient 
             words={raceWords}
             difficulty={(roomDifficulty as any) || 'medium'}
             seedStr={raceState.seedStr}
             onProgress={(p, foundWords) => updateMyState({ progress: p, total: raceWords.length, foundWords })}
             onComplete={(s, t) => updateMyState({ progress: raceWords.length, foundWords: raceWords })}
             hideGarland={true}
           />
         </div>

         {/* Partner Grid (Desktop only) */}
         <div className="hidden lg:flex flex-1 w-full min-h-0 overflow-hidden relative flex-col items-center">
           <h3 className="font-display text-xl text-ink mb-4">{them?.name || 'Partner'}</h3>
           <PartnerGridDisplay 
             words={raceWords}
             difficulty={(them?.difficulty as any) || 'medium'}
             seedStr={raceState.seedStr || 'daily-seed-123'}
             foundWords={them?.foundWords || []}
           />
         </div>
       </div>

       {/* Unified Chat Component */}
       <ChatWidget 
         messages={chatMessages} 
         onSend={sendChat} 
         activeUserId={activeUserId} 
         partnerName={them?.name || 'Partner'} 
       />
    </div>
  );
}
