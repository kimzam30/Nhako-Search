'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';

export default function RaceLobbyPage() {
  const [roomCode, setRoomCode] = useState('');
  const router = useRouter();

  const handleCreate = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    router.push(`/play/race/${code}`);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      router.push(`/play/race/${roomCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-4 bg-background items-center justify-center">
      <div className="bg-surface p-8 rounded-3xl border-4 border-ink shadow-sm max-w-sm w-full flex flex-col gap-8 text-center">
        <h1 className="text-3xl font-display text-ink">Race a Friend</h1>
        
        <motion.button 
          whileTap={{ scale: 0.95 }}
          transition={softBounce}
          onClick={handleCreate}
          className="w-full bg-accent text-ink font-body font-bold py-4 px-4 rounded-xl border-2 border-ink shadow-[0_4px_0_var(--ink)] active:translate-y-1 active:shadow-none"
        >
          Create Room
        </motion.button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-ink/20"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-surface text-ink/60 font-body">or join existing</span>
          </div>
        </div>

        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <input 
            type="text" 
            placeholder="Room Code" 
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase())}
            className="w-full bg-background border-2 border-ink p-3 rounded-xl font-display text-center text-2xl tracking-widest text-ink outline-none focus:border-accent"
            maxLength={4}
          />
          <motion.button 
            whileTap={{ scale: 0.95 }}
            transition={softBounce}
            type="submit"
            disabled={!roomCode}
            className="w-full bg-surface text-ink font-body font-bold py-3 px-4 rounded-xl border-2 border-ink disabled:opacity-50 disabled:active:translate-y-0 disabled:shadow-none shadow-[0_4px_0_var(--ink)] active:translate-y-1 active:shadow-none"
          >
            Join Room
          </motion.button>
        </form>
      </div>
    </div>
  );
}
