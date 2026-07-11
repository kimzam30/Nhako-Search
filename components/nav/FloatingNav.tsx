'use client';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import Link from 'next/link';
import { FlameSvg, MapSvg, HomeSvg, RaceSvg, UserSvg, PauseSvg, VolumeSvg, CloseSvg } from '@/components/ui/Icons';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/multiplayer/supabase';
import { useAmbientAudio } from '@/components/sound/AmbientAudioProvider';

export function FloatingNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [showMixer, setShowMixer] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { volumes, setVolume, isPlaying, startAmbience, stopAmbience } = useAmbientAudio();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessionUser(data?.user || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setSessionUser(session?.user || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!pathname) return null;

  const isHidden = pathname === '/sign-in';
  
  // Rule for active gameplay: Standard and Level play matches, Race play matches (but not lobby/ready/results)
  // Standard setup isn't active play, so standard setup should show full nav. Wait, standard has [...slug].
  // Let's assume standard gameplay is always active timed for simplicity, or we check if there's an active timer.
  // design.md §7.1: "Minimized to a single small pause/menu button (top-left) during active, timed Level gameplay and Race gameplay."
  // For now, let's look at paths:
  const isLevelGameplay = pathname.startsWith('/level-path/') && pathname !== '/level-path';
  const isRaceGameplay = pathname.match(/^\/play\/race\/[^\/]+$/) && !pathname.endsWith('/lobby') && !pathname.endsWith('/ready') && !pathname.endsWith('/results');
  const isDailyGameplay = pathname === '/daily'; // Wait, daily could be "already played" state. We'll refine this when we build the daily screen, but for now we'll check it roughly. Or we can have a context for "is active gameplay".
  // Let's use a simpler check: if it's race gameplay or level gameplay.
  const isStandardGameplay = pathname.startsWith('/play/standard/');

  // For this step, we will use a global event or context later if needed, but path based works for Race/Level.
  const isMinimized = isLevelGameplay || isRaceGameplay || isStandardGameplay;

  if (isHidden) return null;

  if (isMinimized) {
    return (
      <div className="fixed top-4 left-4 z-50">
        <motion.button
          whileTap={{ scale: 0.9, y: 2, boxShadow: '0 0 0 0 var(--ink)' }}
          transition={softBounce}
          onClick={() => {
            if (window.confirm("Leave this puzzle? Your current attempt won't be saved.")) {
              router.push('/');
            }
          }}
          className="w-12 h-12 bg-surface border-2 border-ink shadow-[4px_5px_0_0_var(--ink)] rounded-tl-[16px] rounded-tr-[8px] rounded-br-[14px] rounded-bl-[10px] flex items-center justify-center text-ink"
        >
          <PauseSvg className="w-6 h-6" />
        </motion.button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:left-6 md:-translate-x-0 z-50">
      
      <AnimatePresence>
        {showMixer && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-64 bg-surface border-2 border-ink shadow-[4px_5px_0_0_var(--ink)] rounded-3xl p-4 flex flex-col gap-4 origin-bottom"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-display font-bold text-ink">Mixer</span>
              <button 
                onClick={() => isPlaying ? stopAmbience() : startAmbience()}
                className={`px-3 py-1 text-xs font-bold rounded-full border-2 border-ink shadow-[1px_2px_0_0_var(--ink)] ${isPlaying ? 'bg-accent' : 'bg-background'}`}
              >
                {isPlaying ? 'ON' : 'OFF'}
              </button>
            </div>
            
            {/* Mini Tracks */}
            {[
              { id: 'master', label: 'Master', color: 'bg-accent' },
              { id: 'lofi', label: 'Lofi', color: 'bg-ink/10' },
              { id: 'rain', label: 'Rain', color: 'bg-ink/10' },
              { id: 'wind', label: 'Wind', color: 'bg-ink/10' },
              { id: 'birds', label: 'Birds', color: 'bg-ink/10' }
            ].map(track => (
              <div key={track.id} className="flex flex-col gap-1 w-full">
                <div className="flex justify-between font-body text-ink/80 text-xs font-bold">
                  <span>{track.label}</span>
                  <span>{(volumes as any)[track.id]}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" 
                  value={(volumes as any)[track.id]} 
                  onChange={(e) => setVolume(track.id as any, parseInt(e.target.value))}
                  className={`w-full h-2 ${track.color} rounded-full appearance-none cursor-pointer`}
                />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-row md:flex-col items-center justify-center gap-2 relative">
        
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-row md:flex-col items-center gap-2 overflow-hidden bg-surface p-2 border-2 border-ink rounded-[28px] shadow-[4px_5px_0_0_var(--ink)]"
            >
              <NavLink href="/daily" icon={<FlameSvg className="w-6 h-6" />} isActive={pathname.startsWith('/daily')} onClick={() => setIsOpen(false)} />
              <NavLink href="/level-path" icon={<MapSvg className="w-6 h-6" />} isActive={pathname.startsWith('/level-path')} onClick={() => setIsOpen(false)} />

              <Link href="/" className="relative group" onClick={() => setIsOpen(false)}>
                <motion.div 
                  whileTap={{ scale: 0.9, y: 2, boxShadow: '0 0 0 0 var(--ink)' }}
                  transition={softBounce}
                  className={`w-14 h-14 -mx-1 md:-my-1 md:mx-0 flex items-center justify-center bg-accent border-2 border-ink shadow-[4px_5px_0_0_var(--ink)] text-ink z-10 relative`}
                  style={{ borderRadius: '63% 37% 54% 46% / 55% 45% 62% 38%' }}
                >
                  <HomeSvg className="w-7 h-7" />
                </motion.div>
              </Link>
              
              <NavLink href="/play/race/lobby" icon={<RaceSvg className="w-6 h-6" />} isActive={pathname.startsWith('/play/race')} onClick={() => setIsOpen(false)} />
              
              <Link href={sessionUser ? '/profile' : '/sign-in'} className="relative group" onClick={() => setIsOpen(false)}>
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={`w-12 h-12 rounded-2xl border-2 border-ink flex items-center justify-center overflow-hidden bg-surface ${pathname.startsWith('/profile') || pathname === '/sign-in' ? 'bg-accent-soft' : ''}`}
                >
                  {sessionUser?.user_metadata?.avatar_url ? (
                    <img src={sessionUser.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserSvg className="w-5 h-5 text-ink/70" />
                  )}
                </motion.div>
              </Link>
              
              <button onClick={() => setShowMixer(!showMixer)}>
                <motion.div 
                  whileTap={{ scale: 0.9 }}
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl ${showMixer ? 'bg-accent-soft text-ink' : 'text-ink/60 hover:text-ink hover:bg-surface border-2 border-transparent hover:border-ink/20'}`}
                >
                  <VolumeSvg className="w-6 h-6" />
                </motion.div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button 
          whileTap={{ scale: 0.9, y: 2, boxShadow: '0 0 0 0 var(--ink)' }}
          onClick={() => { setIsOpen(!isOpen); if (showMixer) setShowMixer(false); }}
          className={`h-14 flex items-center justify-center bg-surface border-2 border-ink shadow-[4px_5px_0_0_var(--ink)] rounded-[28px] text-ink z-20 ${isOpen ? 'w-14' : 'px-6 gap-2 bg-surface'}`}
        >
          {isOpen ? <CloseSvg className="w-6 h-6" /> : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <line x1="4" y1="12" x2="20" y2="12"></line>
                <line x1="4" y1="6" x2="20" y2="6"></line>
                <line x1="4" y1="18" x2="20" y2="18"></line>
              </svg>
              <span className="font-body font-bold text-sm tracking-widest uppercase">Menu</span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}

function NavLink({ href, icon, isActive, onClick }: { href: string, icon: React.ReactNode, isActive: boolean, onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick}>
      <motion.div 
        whileTap={{ scale: 0.9 }}
        className={`w-12 h-12 flex items-center justify-center rounded-2xl ${isActive ? 'bg-accent-soft text-ink' : 'text-ink/60 hover:text-ink hover:bg-surface'}`}
      >
        {icon}
      </motion.div>
    </Link>
  );
}
