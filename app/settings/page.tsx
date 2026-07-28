'use client';
import { useAmbientAudio } from '@/components/sound/AmbientAudioProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import { supabase } from '@/lib/multiplayer/supabase';
import type { User } from '@supabase/supabase-js';
import type { AudioVolumes } from '@/components/sound/AmbientAudioProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getUserProfile, updateDisplayName } from '@/lib/auth/profile';
import { deleteAllUserData } from '@/lib/auth/deleteData';

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
  const { volumes, setVolume, isPlaying, startAmbience, stopAmbience, applyPreset, presets } =
    useAmbientAudio();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [theme, setThemeState] = useState('system');
  const [profile, setProfile] = useState<{ displayName: string, avatarUrl: string, isGuest: boolean } | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setThemeState(localStorage.getItem('nhako_theme') || 'system');
    getUserProfile().then(p => {
      setProfile(p);
      setEditNameValue(p.displayName);
    });
  }, []);

  const setTheme = (t: string) => {
    setThemeState(t);
    localStorage.setItem('nhako_theme', t);
    const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  };

  const saveName = async () => {
    const name = editNameValue.trim() || 'Player';
    await updateDisplayName(name);
    setProfile(prev => prev ? { ...prev, displayName: name } : null);
    setIsEditingName(false);
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
    setIsDeleting(true);
    setDeleteError('');
    const result = await deleteAllUserData();
    setIsDeleting(false);

    if (!result.ok) {
      setDeleteError(`Could not clear: ${result.failed.join(', ')}. Nothing else was touched.`);
      return;
    }
    setConfirmDelete(false);
    router.push('/sign-in');
  };

  // Presets now live with the audio engine and crossfade as a single change,
  // instead of stepping each channel one at a time.

  return (
    <div className="flex flex-col items-center flex-1 w-full max-w-lg mx-auto p-4 pt-10 pb-32">
      <h1 className="text-4xl font-display text-ink mb-8">Settings</h1>
      
      <div className="w-full flex flex-col">
        {/* Appearance */}
        <Section title="Appearance" defaultOpen={false}>
          <div className="flex flex-col gap-2 relative">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-bold text-ink/70">Select Theme</span>
              <motion.span 
                animate={{ opacity: [0.4, 0.8, 0.4], x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="text-[10px] font-bold text-ink/50 uppercase tracking-widest"
              >
                Scroll for more →
              </motion.span>
            </div>
            
            {/* Scrollable Container */}
            <div className="flex flex-row gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-6 px-6 hide-scrollbar relative">
              {['Light', 'Dark', 'System'].map(t => (
                <button 
                  key={t}
                  onClick={() => setTheme(t.toLowerCase())}
                  className={`snap-center flex-none w-32 py-4 px-4 rounded-xl font-body font-bold border-2 transition-all ${theme === t.toLowerCase() ? 'bg-accent border-ink shadow-[2px_3px_0_0_var(--ink)]' : 'bg-background border-ink/20 text-ink/70'}`}
                >
                  {t} Mode
                </button>
              ))}
            </div>
            
            {/* Right gradient fade for visual hint */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface to-transparent pointer-events-none" />
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

            <div className="grid grid-cols-2 gap-2">
              {presets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  className="bg-surface border-2 border-ink py-2 px-2 rounded-lg font-body font-bold text-sm shadow-[2px_3px_0_0_var(--ink)] active:translate-y-[2px] active:shadow-none min-h-[44px]"
                >
                  {preset.label}
                </button>
              ))}
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
              {([
                { id: 'lofi', label: 'Lofi Beats', initial: 'L' },
                { id: 'rain', label: 'Rain Drops', initial: 'R' },
                { id: 'thunder', label: 'Thunder', initial: 'T' },
                { id: 'wind', label: 'Wind Swirl', initial: 'W' },
                { id: 'birds', label: 'Morning Birds', initial: 'B' },
                { id: 'sfx', label: 'Game Sounds', initial: 'S' }
              ] as { id: keyof AudioVolumes; label: string; initial: string }[]).map(track => (
                <div key={track.id} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface border-2 border-ink flex items-center justify-center font-display font-bold text-lg flex-shrink-0">
                    {track.initial}
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex justify-between font-body text-ink/80 text-sm font-bold">
                      <span>{track.label}</span>
                      <span>{volumes[track.id]}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      value={volumes[track.id]} 
                      onChange={(e) => setVolume(track.id, parseInt(e.target.value))}
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
          {profile ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 bg-background p-4 rounded-xl border-2 border-ink/10">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    width={48}
                    height={48}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full border border-ink/20"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-surface border-2 border-ink flex items-center justify-center font-display font-bold text-xl text-ink">
                    {profile.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                
                <div className="flex flex-col flex-1">
                  {isEditingName ? (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={editNameValue} 
                        onChange={e => setEditNameValue(e.target.value)}
                        className="flex-1 bg-surface border-2 border-ink rounded px-2 py-1 font-bold text-ink outline-none"
                        autoFocus
                      />
                      <button onClick={saveName} className="bg-accent px-3 py-1 rounded border-2 border-ink font-bold shadow-[2px_2px_0_0_var(--ink)] active:translate-y-[2px] active:shadow-none">Save</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink text-lg">{profile.displayName}</span>
                      <button onClick={() => setIsEditingName(true)} className="text-xs font-bold uppercase tracking-widest text-ink/50 hover:text-ink">Edit</button>
                    </div>
                  )}
                  {user && <span className="text-sm text-ink/60">{user.email}</span>}
                  {profile.isGuest && <span className="text-sm text-ink/60">Guest Mode</span>}
                </div>
              </div>
              
              {!profile.isGuest && (
                <Button onClick={handleSignOut} fullWidth variant="secondary" className="border-ink/20 hover:bg-background">
                  Sign out
                </Button>
              )}
              {profile.isGuest && (
                <Button onClick={() => router.push('/sign-in')} fullWidth variant="primary">
                  Sign in to save progress
                </Button>
              )}
              {!confirmDelete ? (
                <Button onClick={() => setConfirmDelete(true)} fullWidth variant="danger">
                  Delete My Data
                </Button>
              ) : (
                <div className="flex flex-col gap-3 bg-background border-2 border-ink rounded-xl p-4">
                  <p className="font-body font-bold text-ink text-sm">
                    This erases your levels, streak, butterflies and race history
                    from the server and this device. It cannot be undone.
                  </p>
                  {deleteError && (
                    <p className="font-body text-sm text-red-500 font-bold">{deleteError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setConfirmDelete(false);
                        setDeleteError('');
                      }}
                      fullWidth
                      variant="secondary"
                      disabled={isDeleting}
                    >
                      Keep it
                    </Button>
                    <Button
                      onClick={handleDeleteData}
                      fullWidth
                      variant="danger"
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete everything'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-pulse h-24 bg-ink/5 rounded-xl w-full" />
          )}
        </Section>

        {/* About */}
        <Section title="About" defaultOpen={false}>
          <div className="flex flex-col gap-4 text-ink/70 font-body text-sm">
            <p>Made by kimzam  for date nights and lazy afternoons.</p>
            <p className="font-bold">About the sound:</p>
            <p>
              Every layer is generated live in your browser rather than streamed
              from a recording, so it never loops the same way twice and costs
              nothing to download.
            </p>
            <p className="pt-2 text-xs opacity-50">Version 1.0.0</p>
          </div>
        </Section>
      </div>
    </div>
  );
}
