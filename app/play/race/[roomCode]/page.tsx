'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRaceRoom } from '@/lib/multiplayer/useRaceRoom';
import { GameClient } from '@/components/game/GameClient';
import { motion, AnimatePresence } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import { ButterflyGarland } from '@/components/game/ButterflyGarland';
import { supabase } from '@/lib/multiplayer/supabase';

const QUICK_BANTER = ["GG!", "😤", "So close!", "Nice find!", "Let's go!", "Hurry up!"];

export default function RaceRoomPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        setUserName(data.user.email?.split('@')[0] || 'Player');
      } else {
        const tempId = 'guest-' + Math.random().toString(36).substr(2, 6);
        setUserId(tempId);
        setUserName('Guest');
      }
    });
  }, []);

  if (!userId) return <div className="p-4 flex justify-center text-ink w-full min-h-screen items-center">Loading Room...</div>;
  return <RaceRoom activeUserId={userId} activeUserName={userName} roomCode={roomCode} />;
}

function RaceRoom({ activeUserId, activeUserName, roomCode }: { activeUserId: string, activeUserName: string, roomCode: string }) {
  const { raceState, updateMyState, chatMessages, sendChat } = useRaceRoom(roomCode, activeUserId, activeUserName);
  const [showChatTray, setShowChatTray] = useState(false);

  const me = raceState.playerA?.id === activeUserId ? raceState.playerA : raceState.playerB;
  const them = raceState.playerA?.id === activeUserId ? raceState.playerB : raceState.playerA;

  const handleDifficulty = (diff: string) => updateMyState({ difficulty: diff });
  const handleReady = () => updateMyState({ ready: true });
  
  if (raceState.status === 'lobby') {
    return (
      <div className="flex flex-col flex-1 p-4 bg-background items-center justify-center">
        <div className="bg-surface p-8 rounded-3xl border-4 border-ink shadow-sm max-w-sm w-full flex flex-col gap-6 text-center">
          <h1 className="text-3xl font-display text-ink">Room: {roomCode}</h1>
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold font-display text-ink">You ({activeUserName})</h2>
            <div className="flex justify-center gap-2">
              {['easy', 'medium', 'hard'].map(d => (
                <button 
                  key={d} 
                  onClick={() => handleDifficulty(d)}
                  className={`px-3 py-1 rounded-full border-2 capitalize font-body min-h-[44px] min-w-[64px] ${me?.difficulty === d ? 'bg-accent border-ink text-ink shadow-[0_2px_0_var(--ink)]' : 'bg-surface border-ink/30 text-ink/70'}`}
                >
                  {d}
                </button>
              ))}
            </div>
            {!me?.ready ? (
              <motion.button 
                whileTap={{ scale: 0.95 }} transition={softBounce}
                onClick={handleReady}
                className="w-full bg-accent text-ink font-body font-bold py-3 rounded-xl border-2 border-ink shadow-[0_4px_0_var(--ink)] active:translate-y-1 active:shadow-none mt-2 min-h-[44px]"
              >
                Ready Up
              </motion.button>
            ) : (
              <p className="font-bold text-found">Waiting for partner...</p>
            )}
          </div>
          
          <div className="border-t-2 border-ink/10 pt-4">
            <h2 className="text-xl font-bold font-display text-ink">Partner ({them?.name || 'Waiting...'})</h2>
            {them && <p className="font-body text-ink">Difficulty: {them.difficulty}</p>}
            <p className="font-body text-ink/70">{them?.ready ? 'Ready!' : 'Selecting...'}</p>
          </div>
        </div>
      </div>
    );
  }

  const raceWords = ['GARDEN', 'BUTTERFLY', 'BREEZE', 'NATURE', 'SUNSET', 'CLOUDS', 'FLOWER', 'SPRING', 'BLOSSOM', 'MEADOW'].slice(0, me?.difficulty === 'easy' ? 6 : me?.difficulty === 'medium' ? 8 : 10);

  return (
    <div className="flex flex-col flex-1 bg-background relative w-full h-full overflow-hidden">
       <div className="flex justify-between w-full max-w-lg mx-auto p-4 absolute top-0 left-0 right-0 z-10 bg-background/90 backdrop-blur-sm border-b-2 border-ink/10">
         <div className="flex flex-col items-start w-1/2">
           <span className="text-sm font-bold text-ink">You</span>
           <ButterflyGarland count={me?.progress || 0} total={me?.total || raceWords.length} />
         </div>
         <div className="flex flex-col items-end w-1/2">
           <span className="text-sm font-bold text-ink">{them?.name || 'Partner'}</span>
           <ButterflyGarland count={them?.progress || 0} total={them?.total || 8} />
         </div>
       </div>

       <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-end p-4 mb-20 gap-2">
         <AnimatePresence>
           {chatMessages.slice(-4).map(msg => (
             <motion.div
               key={msg.id}
               initial={{ opacity: 0, x: msg.sender === activeUserId ? 20 : -20, scale: 0.8 }}
               animate={{ opacity: 1, x: 0, scale: 1 }}
               exit={{ opacity: 0 }}
               className={`w-fit max-w-[70%] px-4 py-2 rounded-2xl border-2 border-ink font-body text-ink font-bold ${msg.sender === activeUserId ? 'self-end bg-accent rounded-br-none' : 'self-start bg-surface rounded-bl-none'}`}
             >
               {msg.text}
             </motion.div>
           ))}
         </AnimatePresence>
       </div>

       <div className="pt-28 pb-20 overflow-y-auto">
         <GameClient 
           words={raceWords}
           difficulty={(me?.difficulty as any) || 'medium'}
           seedStr={raceState.seedStr}
           onProgress={(p) => updateMyState({ progress: p, total: raceWords.length })}
           onComplete={(s, t) => updateMyState({ progress: raceWords.length })}
           hideGarland={true}
         />
       </div>

       <div className="fixed bottom-4 right-4 z-30">
         {showChatTray && (
           <motion.div 
             initial={{ opacity: 0, scale: 0.8, y: 20 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             className="absolute bottom-16 right-0 bg-surface p-4 rounded-3xl border-2 border-ink shadow-sm flex flex-wrap gap-2 w-64 justify-end pointer-events-auto"
           >
             {QUICK_BANTER.map(text => (
               <motion.button
                 key={text}
                 whileTap={{ scale: 0.9 }} transition={softBounce}
                 onClick={() => { sendChat(text); setShowChatTray(false); }}
                 className="bg-accent-soft px-3 py-2 rounded-full border border-ink font-body text-ink font-bold text-sm min-h-[44px]"
               >
                 {text}
               </motion.button>
             ))}
           </motion.div>
         )}
         <motion.button 
           whileTap={{ scale: 0.9 }} transition={softBounce}
           onClick={() => setShowChatTray(!showChatTray)}
           className="w-14 h-14 rounded-full bg-accent border-2 border-ink shadow-[0_4px_0_var(--ink)] active:translate-y-1 active:shadow-none flex items-center justify-center text-2xl"
         >
           💬
         </motion.button>
       </div>
    </div>
  );
}
