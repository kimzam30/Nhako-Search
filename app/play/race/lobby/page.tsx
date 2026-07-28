'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import { Button } from '@/components/ui/Button';
import {
  generateRoomCode,
  normaliseRoomCode,
  isValidRoomCode,
  ROOM_CODE_LENGTH,
} from '@/lib/multiplayer/identity';

export default function RaceLobbyPage() {
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [roomCode, setRoomCode] = useState('');
  const router = useRouter();

  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = () => {
    const lastCreated = localStorage.getItem('nhako_last_room_created');
    if (lastCreated && Date.now() - parseInt(lastCreated) < 10000) {
      setErrorMsg('Please wait 10 seconds before creating another room.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    localStorage.setItem('nhako_last_room_created', Date.now().toString());
    const code = generateRoomCode();
    sessionStorage.setItem('is_leader_' + code, 'true');
    router.push(`/play/race/${code}`);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = normaliseRoomCode(roomCode);
    if (isValidRoomCode(code)) {
      router.push(`/play/race/${code}`);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 bg-transparent items-center justify-center w-full max-w-sm mx-auto h-screen relative">
      <h1 className="text-4xl font-display text-ink mb-8">Race a Friend</h1>
      
      {/* Segmented Control */}
      <div className="flex w-full bg-surface border-2 border-ink rounded-[20px] p-1 shadow-[4px_5px_0_0_var(--ink)] mb-8">
        <button
          onClick={() => setMode('join')}
          className={`flex-1 py-3 text-center rounded-xl font-bold font-body transition-colors ${mode === 'join' ? 'bg-accent text-ink shadow-sm' : 'text-ink/60 hover:bg-white/50'}`}
        >
          Join Room
        </button>
        <button
          onClick={() => setMode('create')}
          className={`flex-1 py-3 text-center rounded-xl font-bold font-body transition-colors ${mode === 'create' ? 'bg-accent text-ink shadow-sm' : 'text-ink/60 hover:bg-white/50'}`}
        >
          Create Room
        </button>
      </div>

      <motion.div 
        key={mode}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={softBounce}
        className="w-full flex flex-col items-center gap-6"
      >
        {mode === 'join' ? (
          <form onSubmit={handleJoin} className="flex flex-col gap-6 w-full items-center">
            <p className="text-ink/80 font-body font-medium text-center">
              Enter the {ROOM_CODE_LENGTH}-character room code from your friend.
            </p>
            <input
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              aria-label="Room code"
              placeholder="CODE"
              value={roomCode}
              onChange={e => setRoomCode(normaliseRoomCode(e.target.value))}
              className="w-full max-w-[280px] bg-surface border-4 border-ink p-4 rounded-2xl font-display text-center text-3xl tracking-[0.3em] text-ink outline-none focus:border-accent shadow-[4px_5px_0_0_var(--ink)] transition-colors"
              maxLength={ROOM_CODE_LENGTH}
            />
            <Button
              type="submit"
              disabled={!isValidRoomCode(roomCode)}
              fullWidth
              variant="primary"
              className={!isValidRoomCode(roomCode) ? 'opacity-50' : ''}
            >
              Join Race
            </Button>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-6 w-full relative">
            <p className="text-ink/80 font-body font-medium text-center">Create a new room and invite your friend.</p>
            {errorMsg && (
              <p className="text-red-500 font-bold text-sm bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20 w-full text-center">
                {errorMsg}
              </p>
            )}
            <Button onClick={handleCreate} fullWidth variant="primary" className="py-6 text-xl">
              Start New Room
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
