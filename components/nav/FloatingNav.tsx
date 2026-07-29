'use client';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import { PauseSvg, VolumeSvg, CloseSvg, HomeSvg, FlameSvg, MapSvg, RaceSvg, UserSvg } from '@/components/ui/Icons';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/multiplayer/supabase';
import type { User } from '@supabase/supabase-js';
import type { AudioVolumes } from '@/components/sound/AmbientAudioProvider';
import { useAmbientAudio } from '@/components/sound/AmbientAudioProvider';
import { Button } from '@/components/ui/Button';

export function FloatingNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [showMixer, setShowMixer] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ href: string } | null>(null);
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

  /*
   * Active, timed gameplay. Leaving mid-puzzle loses the attempt, so nav clicks
   * are intercepted with a confirmation sheet (see handleNav).
   */
  const isLevelGameplay = pathname.startsWith('/level-path/') && pathname !== '/level-path';
  const isRaceGameplay = /^\/play\/race\/[^/]+$/.test(pathname) && !pathname.endsWith('/lobby');
  const isStandardGameplay = pathname.startsWith('/play/standard/');
  const inGameplay = isLevelGameplay || isRaceGameplay || isStandardGameplay;

  /*
   * Collapsing to a single button exists to stop the nav covering the board on
   * a phone. A desktop has room to spare, so the rail stays open there —
   * collapsing it left the screen looking empty with one stray button.
   * Handled with CSS rather than a media-query hook so SSR output matches.
   */
  const showNavItems = !inGameplay || isOpen;
  const navItemsVisibility = inGameplay && !isOpen ? 'hidden md:flex' : 'flex';
  const isMinimized = inGameplay;

  const handleNav = (e: React.MouseEvent, href: string) => {
    if (isMinimized && href !== pathname) {
      e.preventDefault();
      setConfirmAction({ href });
    } else {
      setIsOpen(false);
    }
  };

  if (isHidden) return null;

  return (
    <>
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-8 pointer-events-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setConfirmAction(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              transition={softBounce}
              className="relative bg-surface w-full max-w-sm p-6 border-2 border-ink shadow-[4px_5px_0_0_var(--ink)] flex flex-col gap-6"
              style={{ borderRadius: '22px 9px 26px 13px' }}
            >
              <div className="text-center flex flex-col gap-2">
                <h3 className="font-display text-2xl text-ink">Leave this puzzle?</h3>
                <p className="font-body text-ink/80 font-bold">Your current attempt won't be saved.</p>
              </div>
              <div className="flex gap-4 w-full">
                <Button variant="secondary" fullWidth onClick={() => setConfirmAction(null)}>Stay</Button>
                <Button variant="primary" fullWidth onClick={() => {
                  router.push(confirmAction.href);
                  setConfirmAction(null);
                  setIsOpen(false);
                }}>Leave</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="floating-nav">
      
      <AnimatePresence>
        {showMixer && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 md:bottom-auto md:mb-0 md:left-full md:ml-4 md:top-1/2 md:-translate-y-1/2 md:translate-x-0 w-64 bg-surface border-2 border-ink shadow-[4px_5px_0_0_var(--ink)] rounded-3xl p-4 flex flex-col gap-4 origin-bottom md:origin-left"
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
            {([
              { id: 'master', label: 'Master', color: 'bg-accent' },
              { id: 'lofi', label: 'Lofi', color: 'bg-ink/10' },
              { id: 'rain', label: 'Rain', color: 'bg-ink/10' },
              { id: 'thunder', label: 'Thunder', color: 'bg-ink/10' },
              { id: 'wind', label: 'Wind', color: 'bg-ink/10' },
              { id: 'birds', label: 'Birds', color: 'bg-ink/10' },
              { id: 'sfx', label: 'Sounds', color: 'bg-ink/10' }
            ] as { id: keyof AudioVolumes; label: string; color: string }[]).map(track => (
              <div key={track.id} className="flex flex-col gap-1 w-full">
                <div className="flex justify-between font-body text-ink/80 text-xs font-bold">
                  <span>{track.label}</span>
                  <span>{volumes[track.id]}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" 
                  value={volumes[track.id]} 
                  onChange={(e) => setVolume(track.id, parseInt(e.target.value))}
                  className={`w-full h-2 ${track.color} rounded-full appearance-none cursor-pointer`}
                />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/*
        On a phone the expanded pill stacks ABOVE the toggle (flex-col-reverse,
        toggle being the last child). Laying them out side by side pushed six
        controls across a 375px screen and clipped the row.
      */}
      <div className="flex flex-col-reverse md:flex-col items-center justify-center gap-2 relative">
        
        <AnimatePresence>
          {(showNavItems || inGameplay) && (
            <motion.div 
              key="nav-bar"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={softBounce}
              className={`${navItemsVisibility} flex-row md:flex-col items-center gap-2 overflow-hidden bg-surface p-2 border-2 border-ink rounded-[28px] shadow-[4px_5px_0_0_var(--ink)]`}
            >
              <NavLink href="/daily" icon={<FlameSvg className="w-6 h-6" />} isActive={pathname.startsWith('/daily')} onClick={(e) => handleNav(e, '/daily')} />
              <NavLink href="/level-path" icon={<MapSvg className="w-6 h-6" />} isActive={pathname.startsWith('/level-path')} onClick={(e) => handleNav(e, '/level-path')} />

              <a href="/" onClick={(e) => handleNav(e, '/')} className="relative group">
                <motion.div 
                  whileTap={{ scale: 0.9, y: 2, boxShadow: '0 0 0 0 var(--ink)' }}
                  transition={softBounce}
                  className={`w-14 h-14 -mx-1 md:-my-1 md:mx-0 flex items-center justify-center bg-accent border-2 border-ink shadow-[4px_5px_0_0_var(--ink)] text-ink z-10 relative`}
                  style={{ borderRadius: '63% 37% 54% 46% / 55% 45% 62% 38%' }}
                >
                  <HomeSvg className="w-7 h-7" />
                </motion.div>
              </a>
              
              <NavLink href="/play/race/lobby" icon={<RaceSvg className="w-6 h-6" />} isActive={pathname.startsWith('/play/race')} onClick={(e) => handleNav(e, '/play/race/lobby')} />
              
              <a href={sessionUser ? '/profile' : '/sign-in'} onClick={(e) => handleNav(e, sessionUser ? '/profile' : '/sign-in')} className="relative group">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={`w-12 h-12 rounded-2xl border-2 border-ink flex items-center justify-center overflow-hidden bg-surface ${pathname.startsWith('/profile') || pathname === '/sign-in' ? 'bg-accent-soft' : ''}`}
                >
                  {sessionUser?.user_metadata?.avatar_url ? (
                    <img
                      src={sessionUser.user_metadata.avatar_url}
                      alt=""
                      width={48}
                      height={48}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserSvg className="w-5 h-5 text-ink/70" />
                  )}
                </motion.div>
              </a>
              
              {isMinimized && (
                <button onClick={() => setShowMixer(!showMixer)}>
                  <motion.div 
                    whileTap={{ scale: 0.9 }}
                    className={`w-12 h-12 flex items-center justify-center rounded-2xl ${showMixer ? 'bg-accent-soft text-ink' : 'text-ink/60 hover:text-ink hover:bg-surface border-2 border-transparent hover:border-ink/20'}`}
                  >
                    <VolumeSvg className="w-6 h-6" />
                  </motion.div>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {isMinimized && (
          <motion.button 
            whileTap={{ scale: 0.9, y: 2, boxShadow: '0 0 0 0 var(--ink)' }}
            onClick={() => { setIsOpen(!isOpen); if (showMixer) setShowMixer(false); }}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            className={`md:hidden w-14 h-14 flex items-center justify-center bg-surface border-2 border-ink shadow-[4px_5px_0_0_var(--ink)] rounded-full text-ink z-20`}
          >
            {isOpen ? <CloseSvg className="w-6 h-6" /> : (
              <PauseSvg className="w-6 h-6" />
            )}
          </motion.button>
        )}
      </div>
    </div>
    </>
  );
}

function NavLink({ href, icon, isActive, onClick }: { href: string, icon: React.ReactNode, isActive: boolean, onClick: (e: React.MouseEvent) => void }) {
  return (
    <a href={href} onClick={onClick}>
      <motion.div 
        whileTap={{ scale: 0.9 }}
        className={`w-12 h-12 flex items-center justify-center rounded-2xl ${isActive ? 'bg-accent-soft text-ink' : 'text-ink/60 hover:text-ink hover:bg-surface'}`}
      >
        {icon}
      </motion.div>
    </a>
  );
}
