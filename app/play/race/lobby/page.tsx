'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import { Button } from '@/components/ui/Button';
import { DoodleButterfly } from '@/components/ui/Doodles';
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
    <div className="flex flex-col flex-1 px-5 pb-6 bg-transparent items-center justify-center w-full max-w-sm mx-auto relative" style={{ paddingTop: 'max(1.25rem, var(--safe-top))' }}>
      {/* Not "Race a friend": co-op (Together) lives here too, and players
          who want to play WITH someone never looked under a Race tab. */}
      <h1 className="text-4xl font-display text-ink text-center">Play with a friend</h1>
      <p className="font-accent text-2xl text-ink-2 -rotate-1 mb-4 text-center">race, or solve one board together</p>

      {/* Versus card: two butterflies squaring up, like a PvP lobby. */}
      <div
        className="stagger-in relative w-full flex items-center justify-between px-6 py-4 mb-6 border-2 border-line bg-lav-soft shadow-[4px_5px_0_0_var(--line)]"
        style={{ borderRadius: '24px 14px 26px 16px' }}
        aria-hidden="true"
      >
        <span className="flex flex-col items-center gap-1">
          <DoodleButterfly className="w-16 idle-float" wing="var(--word-1)" wing2="var(--lav)" />
          <span className="font-display font-bold text-ink text-sm">You</span>
        </span>
        <span
          className="nera-pop flex items-center justify-center w-14 h-14 border-2 border-line bg-accent text-on-accent font-display font-bold text-2xl shadow-[3px_4px_0_0_var(--line)] -rotate-6"
          style={{ borderRadius: '63% 37% 54% 46% / 55% 45% 62% 38%' }}
        >
          VS
        </span>
        <span className="flex flex-col items-center gap-1">
          <span className="idle-float [animation-delay:-2s] -scale-x-100">
            <DoodleButterfly className="w-16" wing="var(--word-5)" wing2="var(--word-3)" />
          </span>
          <span className="font-display font-bold text-ink text-sm">Friend</span>
        </span>
      </div>
      
      {/* Segmented Control */}
      <div role="tablist" aria-label="Join or create" className="grid grid-cols-2 gap-1 w-full bg-surface border-2 border-line rounded-[20px] p-1 shadow-[4px_5px_0_0_var(--line)] mb-6">
        {(['join', 'create'] as const).map(m => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`press min-h-[48px] rounded-2xl font-extrabold font-body transition-colors ${mode === m ? 'bg-accent text-on-accent' : 'text-ink-2'}`}
          >
            {m === 'join' ? 'Join room' : 'Create room'}
          </button>
        ))}
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
            <p className="text-ink-2 font-body font-bold text-center">
              Enter the {ROOM_CODE_LENGTH}-character room code from your friend.
            </p>
            <input
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              aria-label="Room code"
              enterKeyHint="go"
              placeholder="CODE"
              value={roomCode}
              onChange={e => setRoomCode(normaliseRoomCode(e.target.value))}
              className="w-full max-w-[280px] bg-surface border-4 border-line p-4 rounded-2xl font-display text-center text-3xl tracking-[0.3em] text-ink outline-none focus:border-accent shadow-[4px_5px_0_0_var(--line)] transition-colors"
              maxLength={ROOM_CODE_LENGTH}
            />
            <Button
              type="submit"
              disabled={!isValidRoomCode(roomCode)}
              fullWidth
              variant="primary"
            >
              Join
            </Button>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-6 w-full relative">
            <p className="text-ink-2 font-body font-bold text-center">Create a new room and invite your friend.</p>
            {errorMsg && (
              <p role="alert" className="text-accent-ink font-bold text-sm bg-accent/10 px-4 py-2 rounded-lg border border-accent/30 w-full text-center">
                {errorMsg}
              </p>
            )}
            <Button onClick={handleCreate} fullWidth variant="primary" className="py-5 text-xl">
              Start a new room
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
