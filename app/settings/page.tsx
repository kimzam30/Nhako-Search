'use client';

import { useAmbientAudio } from '@/components/sound/AmbientAudioProvider';
import { motion } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import { supabase } from '@/lib/multiplayer/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const { volumes, setVolume, isPlaying, startAmbience, stopAmbience } = useAmbientAudio();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
      } else {
        setIsGuest(localStorage.getItem('nhako_guest_mode') === 'true');
      }
    };
    checkUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('nhako_guest_mode');
    router.push('/sign-in');
  };
  
  const handleDeleteData = async () => {
    if (confirm("Are you sure you want to delete all your progress? This cannot be undone.")) {
      // Deleting user data could be done via a server action or RPC if needed, 
      // but for MVP, we just wipe auth and local storage.
      localStorage.clear();
      await supabase.auth.signOut();
      router.push('/sign-in');
    }
  };

  return (
    <div className="flex flex-col flex-1 p-4 bg-background w-full max-w-lg mx-auto pb-10 gap-6">
      <h1 className="text-3xl font-display text-ink border-b-2 border-ink/10 pb-4">Settings</h1>
      
      {/* Sound Mixer */}
      <section className="bg-surface p-6 rounded-3xl border-2 border-ink shadow-sm">
        <h2 className="text-xl font-display text-ink mb-4">Sound Mixer</h2>
        
        {!isPlaying ? (
          <motion.button 
            whileTap={{ scale: 0.95 }}
            transition={softBounce}
            onClick={startAmbience}
            className="w-full bg-accent text-ink font-body font-bold py-3 px-4 rounded-xl mb-6 hover:bg-accent-soft border-2 border-ink shadow-[0_4px_0_var(--ink)] active:translate-y-1 active:shadow-none"
          >
            ▶ Start Ambience
          </motion.button>
        ) : (
          <motion.button 
            whileTap={{ scale: 0.95 }}
            transition={softBounce}
            onClick={stopAmbience}
            className="w-full bg-surface text-ink font-body font-bold py-3 px-4 rounded-xl mb-6 hover:bg-accent-soft border-2 border-ink"
          >
            ⏸ Pause Ambience
          </motion.button>
        )}

        <div className="flex flex-col gap-4">
          {(['master', 'lofi', 'rain', 'wind', 'birds'] as const).map((track) => (
            <div key={track} className="flex flex-col gap-1">
              <div className="flex justify-between font-body text-ink capitalize text-sm font-bold">
                <span>{track}</span>
                <span>{volumes[track]}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={volumes[track]} 
                onChange={(e) => setVolume(track, parseInt(e.target.value))}
                className="w-full h-2 bg-accent-soft rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>
          ))}
        </div>
      </section>
      
      {/* Account */}
      <section className="bg-surface p-6 rounded-3xl border-2 border-ink shadow-sm">
        <h2 className="text-xl font-display text-ink mb-4">Account</h2>
        
        {user ? (
          <div className="flex flex-col gap-4">
            <p className="font-body text-ink">Signed in as {user.email}</p>
            <button 
              onClick={handleSignOut}
              className="bg-accent-soft text-ink font-bold py-2 rounded-xl hover:bg-accent border-2 border-ink min-h-[44px]"
            >
              Sign out
            </button>
            <button 
              onClick={handleDeleteData}
              className="bg-transparent text-ink font-bold py-2 rounded-xl hover:bg-red-200 border-2 border-red-400 min-h-[44px]"
            >
              Delete my data
            </button>
          </div>
        ) : isGuest ? (
          <div className="flex flex-col gap-4">
            <p className="font-body text-ink">Playing as Guest.</p>
            <button 
              onClick={() => router.push('/sign-in')}
              className="bg-accent text-ink font-bold py-2 rounded-xl hover:bg-accent-soft border-2 border-ink min-h-[44px]"
            >
              Sign in with Google to save your progress
            </button>
          </div>
        ) : (
          <p className="font-body text-ink">Checking account status...</p>
        )}
      </section>
    </div>
  );
}
