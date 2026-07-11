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
import { ChatToast } from '@/components/multiplayer/ChatToast';

const QUICK_BANTER = ["GG!", "😤", "So close!", "Nice find!", "🦋", "Hurry up!"];

export default function RaceRoomPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (data?.user) {
        setUserId(data.user.id);
        setUserName(data.user.email?.split('@')[0] || 'Player');
      } else {
        const tempId = 'guest-' + Math.random().toString(36).substr(2, 6);
        setUserId(tempId);
        setUserName('Guest');
      }
    }).catch(() => {
      const tempId = 'guest-' + Math.random().toString(36).substr(2, 6);
      setUserId(tempId);
      setUserName('Guest');
    });
  }, []);

  if (!userId) return <div className="flex h-screen w-full items-center justify-center text-ink font-display text-2xl">Loading...</div>;
  return <RaceRoom activeUserId={userId} activeUserName={userName} roomCode={roomCode} />;
}

function RaceRoom({ activeUserId, activeUserName, roomCode }: { activeUserId: string, activeUserName: string, roomCode: string }) {
  const router = useRouter();
  const { raceState, updateMyState, chatMessages, sendChat, startRaceAsLeader } = useRaceRoom(roomCode, activeUserId, activeUserName);
  const [showChatTray, setShowChatTray] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const int = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(int);
  }, []);

  const me = raceState.playerA?.id === activeUserId ? raceState.playerA : raceState.playerB;
  const them = raceState.playerA?.id === activeUserId ? raceState.playerB : raceState.playerA;

  const handleDifficulty = (diff: string) => updateMyState({ difficulty: diff });
  const raceWords = ['GARDEN', 'BUTTERFLY', 'BREEZE', 'NATURE', 'SUNSET', 'CLOUDS', 'FLOWER', 'SPRING', 'BLOSSOM', 'MEADOW'].slice(0, me?.difficulty === 'easy' ? 6 : me?.difficulty === 'medium' ? 8 : 10);

  const isFinished = (me?.progress === me?.total && (me?.total ?? 0) > 0) || (them?.progress === them?.total && (them?.total ?? 0) > 0);
  const winner = isFinished ? (me?.progress === me?.total ? 'me' : 'them') : null;

  useEffect(() => {
    if (isFinished && me && them) {
      // Only let playerA trigger the save to prevent duplicates
      const isPlayerA = raceState.playerA?.id === activeUserId;
      if (isPlayerA) {
         import('@/lib/multiplayer/history').then(({ saveRaceHistory }) => {
            const winnerId = winner === 'me' ? activeUserId : them.id;
            saveRaceHistory(activeUserId, them.id, winnerId, me.difficulty, them.difficulty);
         });
      }
    }
  }, [isFinished, me, them, activeUserId, raceState.playerA, winner]);

  if (raceState.status === 'lobby') {
    return (
      <div className="flex flex-col flex-1 p-4 bg-background items-center justify-center w-full max-w-lg mx-auto">
        <h1 className="text-4xl font-display text-ink mb-2">Room: {roomCode}</h1>
        <p className="font-body text-ink/70 mb-8 font-bold">Waiting for your partner to join...</p>

        <div className="flex gap-4 w-full mb-8">
          <Card className="flex-1 flex flex-col gap-4 text-center items-center justify-center py-8">
            <h2 className="text-xl font-bold font-display text-ink">{activeUserName} (You)</h2>
            <div className="flex flex-col gap-2 w-full">
              {['easy', 'medium', 'hard'].map(d => (
                <button 
                  key={d} 
                  onClick={() => me?.isLeader && handleDifficulty(d)}
                  disabled={!me?.isLeader}
                  className={`py-2 rounded-xl border-2 capitalize font-body font-bold w-full transition-colors ${me?.difficulty === d ? 'bg-accent border-ink text-ink shadow-[0_2px_0_var(--ink)]' : 'bg-surface border-ink/30 text-ink/70'} ${!me?.isLeader ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {d}
                </button>
              ))}
            </div>
            {me?.isLeader ? (
              <Button 
                variant="primary" 
                fullWidth 
                onClick={startRaceAsLeader}
                className="mt-4"
              >
                Start Race
              </Button>
            ) : (
              <div className="mt-4 py-3 font-bold font-body text-ink/70 border-2 border-ink/20 rounded-xl bg-surface">
                Waiting for Leader...
              </div>
            )}
          </Card>
          
          <Card className="flex-1 flex flex-col gap-4 text-center items-center justify-center py-8 bg-surface/50 opacity-80">
            <h2 className="text-xl font-bold font-display text-ink">{them?.name || 'Waiting...'}</h2>
            {them ? (
              <>
                <p className="font-body text-ink font-bold capitalize bg-surface border-2 border-ink px-4 py-2 rounded-xl w-full">Diff: {them.difficulty}</p>
                <div className={`w-full py-4 rounded-xl border-2 font-display text-xl bg-surface border-ink/30 text-ink/50`}>
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
  const timeElapsed = Math.floor((now - (raceState.startTime || now)) / 1000);
  
  return (
    <div className="flex flex-col bg-background relative w-full h-screen overflow-hidden">
       
       <div className="flex-none flex flex-col w-full max-w-lg mx-auto p-4 z-10 bg-surface border-b-2 border-ink shadow-[0_4px_0_0_var(--ink)]">
         <div className="flex justify-between items-center mb-4">
           <div className="font-display text-xl text-ink font-bold flex-1">
             {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
           </div>
         </div>
         <div className="flex gap-4 w-full items-center">
           <div className="flex flex-col w-full">
             <span className="text-xs font-bold text-ink uppercase tracking-wider mb-1">You</span>
             <ButterflyGarland count={me?.progress || 0} total={me?.total || raceWords.length} />
           </div>
           <div className="w-px h-8 bg-ink/20" />
           <div className="flex flex-col w-full items-end">
             <span className="text-xs font-bold text-ink uppercase tracking-wider mb-1">{them?.name || 'Partner'}</span>
             {/* Slim strip for partner progress */}
             <div className="w-full h-3 bg-surface border-2 border-ink rounded-full overflow-hidden relative">
               <div className="h-full bg-accent transition-all duration-500" style={{ width: `${((them?.progress || 0) / (them?.total || 1)) * 100}%` }} />
             </div>
           </div>
         </div>
       </div>

       <div className="absolute top-28 left-0 right-0 z-50 pointer-events-none flex justify-center">
         <ChatToast messages={chatMessages} activeUserId={activeUserId} partnerName={them?.name || 'Partner'} />
       </div>

       <div className="flex-1 w-full max-w-lg mx-auto min-h-0 pt-4 pb-20 px-2 overflow-hidden">
         <GameClient 
           words={raceWords}
           difficulty={(me?.difficulty as any) || 'medium'}
           seedStr={raceState.seedStr}
           onProgress={(p) => updateMyState({ progress: p, total: raceWords.length })}
           onComplete={(s, t) => updateMyState({ progress: raceWords.length })}
           hideGarland={true}
         />
       </div>

       {/* Chat Tray */}
       <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-4">
         <AnimatePresence>
           {showChatTray && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.8, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.8, y: 20 }}
               className="bg-surface p-4 rounded-3xl border-2 border-ink shadow-[4px_5px_0_0_var(--ink)] flex flex-wrap gap-2 w-64 justify-end pointer-events-auto origin-bottom-right"
             >
               {QUICK_BANTER.map(text => (
                 <motion.button
                   key={text}
                   whileTap={{ scale: 0.9 }} transition={softBounce}
                   onClick={() => { sendChat(text); setShowChatTray(false); }}
                   className="bg-accent-soft px-3 py-2 rounded-xl border-2 border-ink font-body text-ink font-bold text-sm min-h-[44px] shadow-[2px_2px_0_0_var(--ink)] active:translate-y-[2px] active:shadow-none"
                 >
                   {text}
                 </motion.button>
               ))}
             </motion.div>
           )}
         </AnimatePresence>
         <motion.button 
           whileTap={{ scale: 0.9 }} transition={softBounce}
           onClick={() => setShowChatTray(!showChatTray)}
           className="w-14 h-14 rounded-full bg-gold border-2 border-ink shadow-[4px_5px_0_0_var(--ink)] active:translate-y-1 active:shadow-[0px_0px_0_0_var(--ink)] flex items-center justify-center pointer-events-auto"
         >
           <ChatSvg className="w-6 h-6 text-ink" />
         </motion.button>
       </div>
    </div>
  );
}
