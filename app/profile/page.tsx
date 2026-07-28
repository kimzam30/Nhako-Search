'use client';
import { supabase } from '@/lib/multiplayer/supabase';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import { ButterflySvg, CloseSvg, StarSvg } from '@/components/ui/Icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { wordsFoundForLevels } from '@/lib/levels/data';
import type { CollectionEntry } from '@/lib/types';

// The daily challenge is a medium puzzle: 8 words.
const WORDS_PER_DAILY = 8;

export default function ProfilePage() {
  const [collection, setCollection] = useState<CollectionEntry[]>([]);
  const [selectedButterfly, setSelectedButterfly] = useState<any | null>(null);
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('nhako_guest_mode');
    router.push('/sign-in');
  };

  const [stats, setStats] = useState<{ levels: number, wins: number, streak: number, maxStreak: number, wordsFound: number, racePlayed: number } | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data: userObj } = await supabase.auth.getUser();
      const user = userObj.user;
      
      if (user) {
        const { data: coll } = await supabase.from('butterfly_collection').select('*').eq('user_id', user.id);
        setCollection(coll || []);
        
        const { data: levelRows } = await supabase.from('level_progress').select('level_id').eq('user_id', user.id);
        const levels = levelRows?.length ?? 0;
        const { count: wins } = await supabase.from('race_history').select('*', { count: 'exact', head: true }).eq('winner', user.id);
        const { count: played } = await supabase.from('race_history').select('*', { count: 'exact', head: true }).or(`player_a.eq.${user.id},player_b.eq.${user.id}`);
        
        const { data: logs } = await supabase.from('daily_challenge_log')
          .select('streak_count')
          .eq('user_id', user.id)
          .order('challenge_date', { ascending: false });
          
        const maxStreak = logs && logs.length > 0 ? Math.max(0, ...logs.map(l => l.streak_count)) : 0;
        const currentStreak = logs && logs.length > 0 ? logs[0].streak_count : 0;
        
        setStats({
          levels: levels || 0,
          wins: wins || 0,
          racePlayed: played || 0,
          streak: currentStreak,
          maxStreak: maxStreak,
          // Derived from the actual difficulty of each completed level plus
          // the daily puzzles, rather than the old flat `levels * 8` guess.
          wordsFound:
            wordsFoundForLevels((levelRows ?? []).map(r => r.level_id)) +
            (logs?.length ?? 0) * WORDS_PER_DAILY,
        });
      } else {
        const saved = JSON.parse(localStorage.getItem('nhako_collection') || '[]');
        setCollection(saved);
        
        const localLevels = JSON.parse(localStorage.getItem('nhako_levels') || '{}');
        const localDaily = JSON.parse(localStorage.getItem('nhako_daily') || '{}');

        const levelIds = Object.keys(localLevels);
        const levels = levelIds.length;
        const dailyCount = Array.isArray(localDaily.history) ? localDaily.history.length : 0;
        const wins = 0;
        const played = 0;
        const streak = localDaily.streak || 0;
        const maxStreak = localDaily.streak || 0;
        
        setStats({
          levels,
          wins,
          racePlayed: played,
          streak,
          maxStreak,
          wordsFound: wordsFoundForLevels(levelIds) + dailyCount * WORDS_PER_DAILY,
        });
      }
    }
    loadData();
  }, []);

  const totalSlots = 30; // 30 possible slots for the album

  return (
    <div className="flex flex-col flex-1 p-4 bg-transparent items-center w-full max-w-lg mx-auto pb-32 pt-8">
      
      {/* Core Stats */}
      <h1 className="text-4xl font-display text-ink mb-6 w-full text-center">Your Profile</h1>
      
      <Card className="w-full mb-8 bg-surface">
        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
          <div className="flex flex-col">
            {stats === null ? <div className="animate-pulse bg-ink/10 h-9 w-16 rounded mb-1" /> : <span className="text-3xl font-display font-bold text-ink">{stats.levels}</span>}
            <span className="text-xs font-bold uppercase tracking-widest text-ink/60">Levels Done</span>
          </div>
          <div className="flex flex-col">
            {stats === null ? <div className="animate-pulse bg-ink/10 h-9 w-16 rounded mb-1" /> : <span className="text-3xl font-display font-bold text-ink">{stats.wordsFound}</span>}
            <span className="text-xs font-bold uppercase tracking-widest text-ink/60">Words Found</span>
          </div>
          <div className="flex flex-col">
            {stats === null ? <div className="animate-pulse bg-ink/10 h-9 w-16 rounded mb-1" /> : <span className="text-3xl font-display font-bold text-ink">{stats.wins}-{stats.racePlayed - stats.wins}</span>}
            <span className="text-xs font-bold uppercase tracking-widest text-ink/60">Race Record</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-end gap-2">
              {stats === null ? <div className="animate-pulse bg-ink/10 h-9 w-12 rounded mb-1" /> : <span className="text-3xl font-display font-bold text-ink">{stats.streak}</span>}
              <span className="text-sm font-display font-bold text-ink/40 pb-1">/ {stats ? stats.maxStreak : '-'} best</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-ink/60">Current Streak</span>
          </div>
        </div>
      </Card>

      <h2 className="text-2xl font-display text-ink mb-6 w-full text-left">Butterfly Collection</h2>
      
      <div className="bg-surface p-6 rounded-3xl border-2 border-ink shadow-[4px_5px_0_0_var(--ink)] w-full">
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 w-full">
          {Array.from({ length: totalSlots }).map((_, i) => {
            const b = collection[i];
            
            if (b) {
              const isDaily = b.butterfly_style_id?.startsWith('daily-');
              const isTogether = b.butterfly_style_id?.startsWith('together-');
              const chapterMatch = b.butterfly_style_id?.match(/level-(c\d+)/);
              const chapterId = chapterMatch ? chapterMatch[1] : 'unknown';
              
              let butterflyColor = 'text-accent';
              let butterflyBg = 'bg-white';
              let title = 'Monarch';
              let Icon = ButterflySvg;

              if (isTogether) {
                butterflyColor = 'text-gold';
                butterflyBg = 'bg-accent/10';
                title = 'Together Butterfly';
              } else if (isDaily) {
                butterflyColor = 'text-[#FFD166]';
                title = `Daily - ${b.butterfly_style_id.split('daily-')[1]}`;
              } else if (chapterId === 'c1' || chapterId === 'c7') {
                butterflyColor = 'text-[#7FCB9C]';
                title = 'Garden Skimmer';
              } else if (chapterId === 'c2' || chapterId === 'c8') {
                butterflyColor = 'text-[#4A1942]';
                title = 'Rainy Blue';
              } else if (chapterId === 'c3' || chapterId === 'c9') {
                butterflyColor = 'text-[#FFC1D9]';
                title = 'Cozy Moth';
              } else if (chapterId === 'c4' || chapterId === 'c10') {
                butterflyColor = 'text-ink';
                title = 'Nightwing';
              } else if (chapterId === 'c5' || chapterId === 'c11') {
                butterflyColor = 'text-[#FF6FA5]';
                title = 'Heartwing';
              } else if (chapterId === 'c6' || chapterId === 'c12') {
                butterflyColor = 'text-accent';
                title = 'Standard Swallowtail';
              }

              return (
                <motion.button 
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.05, ...softBounce }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedButterfly({ ...b, title, color: butterflyColor })}
                  className={`aspect-square rounded-2xl ${butterflyBg} border-2 border-ink shadow-[2px_2px_0_0_var(--ink)] flex flex-col items-center justify-center cursor-pointer relative`}
                  style={{ borderRadius: `${12 + (i%5)}px ${18 - (i%3)}px ${14 + (i%4)}px ${16 - (i%2)}px` }}
                >
                  <Icon className={`w-8 h-8 ${butterflyColor} drop-shadow-sm`} />
                  {isDaily && (
                    <span className="text-[8px] font-bold text-ink/40 absolute bottom-1 truncate w-full text-center px-1">
                      {b.butterfly_style_id.split('-').slice(2).join('/')}
                    </span>
                  )}
                  {/* Sparkle badge for 'new' */}
                  {i === 0 && (
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="absolute -top-2 -right-2 bg-gold border-2 border-ink w-6 h-6 flex items-center justify-center rounded-full z-10"
                    >
                      <StarSvg className="w-3 h-3 text-ink" filled />
                    </motion.div>
                  )}
                </motion.button>
              );
            } else {
              return (
                <div 
                  key={i}
                  className="aspect-square rounded-2xl bg-ink/5 border-2 border-dashed border-ink/20 flex flex-col items-center justify-center"
                  style={{ borderRadius: `${12 + (i%5)}px ${18 - (i%3)}px ${14 + (i%4)}px ${16 - (i%2)}px` }}
                >
                  <ButterflySvg className="w-8 h-8 text-ink/10" />
                </div>
              );
            }
          })}
        </div>
      </div>

      <div className="w-full mt-12 mb-8">
        <Button onClick={handleSignOut} fullWidth variant="danger" className="bg-red-500/20 text-red-500 border-red-500 hover:bg-red-500/30">
          Sign Out
        </Button>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedButterfly && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-40"
              onClick={() => setSelectedButterfly(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={softBounce}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-xs bg-surface border-2 border-ink rounded-[32px] p-8 z-50 shadow-[4px_5px_0_0_var(--ink)] flex flex-col items-center text-center"
            >
              <button 
                onClick={() => setSelectedButterfly(null)}
                className="absolute top-4 right-4 text-ink/60 hover:text-ink"
              >
                <CloseSvg className="w-6 h-6" />
              </button>
              <ButterflySvg className={`w-20 h-20 ${selectedButterfly.color || 'text-accent'} mb-6 drop-shadow-sm`} />
              <h3 className="text-2xl font-display text-ink mb-2">{selectedButterfly.title || 'Monarch'}</h3>
              <p className="text-ink/70 font-body mb-2">Earned from <strong>{selectedButterfly.earned_from || 'Gameplay'}</strong></p>
              <p className="text-ink/50 font-body text-sm">{new Date(selectedButterfly.earned_at || Date.now()).toLocaleDateString()}</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
