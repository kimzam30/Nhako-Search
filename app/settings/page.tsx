'use client';
import { useAmbientAudio } from '@/components/sound/AmbientAudioProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import { supabase } from '@/lib/multiplayer/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const Section = ({ title, defaultOpen = false, children }: { title: string, defaultOpen?: boolean, children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <Card className="w-full mb-4 !p-0 overflow-hidden bg-surface" noShadow={!isOpen}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-6 flex justify-between items-center outline-none"
      >
        <h2 className="text-2xl font-display text-ink">{title}</h2>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="text-ink opacity-60">
          ▼
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={softBounce}
            className="overflow-hidden"
          >
            <div className="p-6 pt-0 border-t-2 border-ink/10">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default function SettingsPage() {
  const { volumes, setVolume, isPlaying, startAmbience, stopAmbience } = useAmbientAudio();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [theme, setThemeState] = useState('system');

  useEffect(() => {
    setThemeState(localStorage.getItem('nhako_theme') || 'system');
  }, []);

  const setTheme = (t: string) => {
    setThemeState(t);
    localStorage.setItem('nhako_theme', t);
    const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
      else setIsGuest(localStorage.getItem('nhako_guest_mode') === 'true');
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('nhako_guest_mode');
    router.push('/sign-in');
  };
  
  const handleDeleteData = async () => {
    if (confirm("Are you sure you want to delete all your progress? This cannot be undone.")) {
      localStorage.clear();
      await supabase.auth.signOut();
      router.push('/sign-in');
    }
  };

  const applyPreset = (preset: string) => {
    if (preset === 'focus') {
      setVolume('lofi', 80); setVolume('rain', 40); setVolume('wind', 0); setVolume('birds', 0);
    } else if (preset === 'nature') {
      setVolume('lofi', 0); setVolume('rain', 20); setVolume('wind', 50); setVolume('birds', 80);
    }
    if (!isPlaying) startAmbience();
  };

  return (
    <div className="flex flex-col items-center flex-1 w-full max-w-lg mx-auto p-4 pt-10 pb-32">
      <h1 className="text-4xl font-display text-ink mb-8">Settings</h1>
      
      <div className="w-full flex flex-col">
        {/* Appearance */}
        <Section title="Appearance" defaultOpen={false}>
          <div className="flex flex-col gap-4">
            {['Light', 'Dark', 'System'].map(t => (
              <button 
                key={t}
                onClick={() => setTheme(t.toLowerCase())}
                className={`py-3 px-4 rounded-xl font-body font-bold border-2 transition-all ${theme === t.toLowerCase() ? 'bg-accent border-ink shadow-[2px_3px_0_0_var(--ink)]' : 'bg-background border-ink/20 text-ink/70'}`}
              >
                {t} Mode
              </button>
            ))}
          </div>
        </Section>

        {/* Sound Mixer */}
        <Section title="Sound Mixer" defaultOpen={true}>
          <div className="flex flex-col gap-6">
            {!isPlaying ? (
              <Button onClick={startAmbience} fullWidth variant="primary" className="py-4">
                ▶ Start Ambience
              </Button>
            ) : (
              <Button onClick={stopAmbience} fullWidth variant="secondary" className="py-4">
                ⏸ Pause Ambience
              </Button>
            )}

            <div className="flex gap-2">
              <button onClick={() => applyPreset('focus')} className="flex-1 bg-surface border-2 border-ink py-2 rounded-lg font-body font-bold text-sm shadow-[2px_3px_0_0_var(--ink)] active:translate-y-[2px] active:shadow-none">Focus</button>
              <button onClick={() => applyPreset('nature')} className="flex-1 bg-surface border-2 border-ink py-2 rounded-lg font-body font-bold text-sm shadow-[2px_3px_0_0_var(--ink)] active:translate-y-[2px] active:shadow-none">Nature</button>
            </div>

            <div className="flex flex-col gap-6 mt-2">
              {/* Master Volume */}
              <div className="flex flex-col gap-2 p-4 bg-accent-soft border-2 border-ink rounded-2xl relative overflow-hidden">
                <div className="flex justify-between font-body text-ink font-bold z-10 relative">
                  <span>Master Volume</span>
                  <span>{volumes.master}%</span>
                </div>
                <input type="range" min="0" max="100" value={volumes.master} onChange={(e) => setVolume('master', parseInt(e.target.value))} className="w-full h-4 bg-surface rounded-full appearance-none cursor-pointer border-2 border-ink z-10 relative" />
              </div>

              {/* Tracks */}
              {[
                { id: 'lofi', label: 'Lofi Beats', initial: 'L' },
                { id: 'rain', label: 'Rain Drops', initial: 'R' },
                { id: 'wind', label: 'Wind Swirl', initial: 'W' },
                { id: 'birds', label: 'Morning Birds', initial: 'B' }
              ].map(track => (
                <div key={track.id} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface border-2 border-ink flex items-center justify-center font-display font-bold text-lg flex-shrink-0">
                    {track.initial}
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex justify-between font-body text-ink/80 text-sm font-bold">
                      <span>{track.label}</span>
                      <span>{(volumes as any)[track.id]}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      value={(volumes as any)[track.id]} 
                      onChange={(e) => setVolume(track.id as any, parseInt(e.target.value))}
                      className="w-full h-3 bg-ink/10 rounded-full appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>
        
        {/* Account */}
        <Section title="Account" defaultOpen={false}>
          {user ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 bg-background p-4 rounded-xl border-2 border-ink/10">
                <img src={user.user_metadata?.avatar_url || ''} className="w-12 h-12 rounded-full border border-ink/20" alt="Avatar" />
                <div className="flex flex-col">
                  <span className="font-bold text-ink">{user.user_metadata?.name || 'Player'}</span>
                  <span className="text-sm text-ink/60">{user.email}</span>
                </div>
              </div>
              <Button onClick={handleSignOut} fullWidth variant="secondary" className="border-ink/20 hover:bg-background">
                Sign out
              </Button>
              <Button onClick={handleDeleteData} fullWidth variant="danger">
                Delete My Data
              </Button>
            </div>
          ) : isGuest ? (
            <div className="flex flex-col gap-4 text-center">
              <p className="font-body text-ink font-medium">You are playing as a Guest.</p>
              <Button onClick={() => router.push('/sign-in')} fullWidth variant="primary">
                Sign in to save progress
              </Button>
            </div>
          ) : null}
        </Section>

        {/* About */}
        <Section title="About" defaultOpen={false}>
          <div className="flex flex-col gap-4 text-ink/70 font-body text-sm">
            <p>Made by kimzam  for date nights and lazy afternoons.</p>
            <p className="font-bold">Audio Attributions:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Lofi Beats - CC0 Public Domain</li>
              <li>Rain & Wind - CC0 via FreeSound</li>
              <li>Birds - CC0 Public Domain</li>
            </ul>
            <p className="pt-2 text-xs opacity-50">Version 1.0.0</p>
          </div>
        </Section>
      </div>
    </div>
  );
}
