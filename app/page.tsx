'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ButterflySvg, UserSvg, FlameSvg, MapSvg, RaceSvg } from '@/components/ui/Icons';
import { supabase } from '@/lib/multiplayer/supabase';
import { mergeGuestProgress } from '@/lib/auth/merge';
import { CHAPTERS, LEVELS } from '@/lib/levels/data';

export default function HomePage() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ levels: 0, wins: 0, streak: 0 });

  useEffect(() => {
    mergeGuestProgress();
    
    const fetchStats = async (currentUser: any) => {
      if (currentUser) {
        // Logged in
        const { count: levels } = await supabase.from('level_progress').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id);
        const { count: wins } = await supabase.from('race_history').select('*', { count: 'exact', head: true }).eq('winner', currentUser.id);
        
        // Simple streak fetch: get the most recent daily log
        const { data: log } = await supabase.from('daily_challenge_log')
          .select('streak_count')
          .eq('user_id', currentUser.id)
          .order('challenge_date', { ascending: false })
          .limit(1)
          .single();
          
        setStats({
          levels: levels || 0,
          wins: wins || 0,
          streak: log?.streak_count || 0
        });
      } else {
        // Guest mode
        const localLevels = JSON.parse(localStorage.getItem('nhako_levels') || '{}');
        const localDaily = JSON.parse(localStorage.getItem('nhako_daily') || '{}');
        
        setStats({
          levels: Object.keys(localLevels).length,
          wins: 0, // Guests don't save race history
          streak: localDaily.streak || 0,
        });
      }
    };

    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
      fetchStats(data?.user || null);
    });
    
    if (sessionStorage.getItem('splash_seen')) {
      setShowSplash(false);
    } else {
      const timer = setTimeout(() => {
        sessionStorage.setItem('splash_seen', 'true');
        setShowSplash(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: softBounce }
  };

  if (showSplash) {
    return (
      <motion.div 
        key="splash"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, ...softBounce }}
          className="relative"
        >
          <h1 className="text-5xl font-display text-ink relative z-10">NhakoSearch</h1>
          <motion.div
            animate={{ y: [-5, 5, -5], rotate: [-2, 2, -2] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute -top-6 -right-8 text-accent"
          >
            <ButterflySvg className="w-8 h-8" />
          </motion.div>
          <motion.div
            animate={{ y: [5, -5, 5], rotate: [2, -2, 2] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
            className="absolute -bottom-4 -left-6 text-gold"
          >
            <ButterflySvg className="w-6 h-6" />
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-6 bg-transparent w-full max-w-lg mx-auto overflow-y-auto">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6 pb-32" // padding bottom for nav
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex justify-between items-center w-full">
          <h1 className="text-3xl font-display text-ink">NhakoSearch</h1>
          <Link href={user ? '/profile' : '/sign-in'}>
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="w-12 h-12 rounded-full border-2 border-ink flex items-center justify-center overflow-hidden bg-surface"
            >
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserSvg className="w-6 h-6 text-ink/70" />
              )}
            </motion.div>
          </Link>
        </motion.div>

        {/* Daily Challenge Card */}
        <motion.div variants={itemVariants}>
          <Card className="flex flex-col gap-4 bg-accent-soft border-ink relative overflow-hidden group cursor-pointer" onClick={() => window.location.href='/daily'}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <FlameSvg className="w-24 h-24" />
            </div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <h2 className="text-sm font-bold text-ink/70 uppercase tracking-widest mb-1">Daily Challenge</h2>
                <h3 className="text-2xl font-display text-ink">Today's Puzzle</h3>
              </div>
              <div className="flex items-center gap-1 bg-surface px-2 py-1 border-2 border-ink rounded-lg" style={{ borderRadius: '8px 12px 10px 8px' }}>
                <FlameSvg className="w-4 h-4 text-accent" />
                <span className="font-bold font-body text-ink text-sm">{stats.streak}</span>
              </div>
            </div>
            <Button variant="primary" className="mt-2" onClick={(e) => { e.stopPropagation(); window.location.href='/daily'; }}>Play Now</Button>
          </Card>
        </motion.div>

        {/* Level Path Teaser */}
        <motion.div variants={itemVariants}>
          <Card className="flex flex-col gap-4 relative overflow-hidden group cursor-pointer" onClick={() => window.location.href='/level-path'}>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <h2 className="text-sm font-bold text-ink/70 uppercase tracking-widest mb-1">Level Path</h2>
                <h3 className="text-xl font-display text-ink">
                  {(() => {
                    const allLevelIds = CHAPTERS.flatMap(c => c.levels);
                    const nextLevelId = allLevelIds[Math.min(stats.levels, allLevelIds.length - 1)] || allLevelIds[0];
                    const nextLvl = LEVELS[nextLevelId];
                    if (!nextLvl) return 'Start Journey';
                    const chapterIndex = CHAPTERS.findIndex(c => c.name === nextLvl.chapter);
                    const levelInChapter = CHAPTERS[chapterIndex].levels.indexOf(nextLevelId) + 1;
                    return `${nextLvl.chapter} - ${levelInChapter}`;
                  })()}
                </h3>
              </div>
              <MapSvg className="w-8 h-8 text-ink/30" />
            </div>
            <Button variant="secondary" className="mt-2" onClick={(e) => { e.stopPropagation(); window.location.href='/level-path'; }}>Continue Path</Button>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="flex gap-4 w-full">
          {/* Race a Friend */}
          <Link href="/play/race/lobby" className="flex-1">
            <Card className="h-full flex flex-col items-center justify-center gap-2 bg-[#FFD166]/40 hover:bg-[#FFD166]/60 transition-colors text-center p-4">
              <RaceSvg className="w-8 h-8 text-ink mb-2" />
              <span className="font-display font-bold text-ink text-lg leading-tight">Race a<br/>Friend</span>
            </Card>
          </Link>
          
          {/* Collection / Profile */}
          <Link href="/profile" className="flex-1">
            <Card className="h-full flex flex-col items-center justify-center gap-2 bg-surface hover:bg-white transition-colors text-center p-4">
              <ButterflySvg className="w-8 h-8 text-accent mb-2" />
              <span className="font-display font-bold text-ink text-lg leading-tight">Butterfly<br/>Collection</span>
            </Card>
          </Link>
        </motion.div>

        {/* Tertiary Action */}
        <motion.div variants={itemVariants} className="w-full">
          <Link href="/play/standard">
            <Button variant="secondary" fullWidth className="border-ink/40 text-ink/80 hover:bg-surface">
              Free Play
            </Button>
          </Link>
        </motion.div>

        {/* Small stats row */}
        <motion.div variants={itemVariants} className="flex justify-between px-2 pt-4 border-t-2 border-ink/10">
          <div className="flex flex-col items-center text-ink">
            <span className="text-xl font-display font-bold">{stats.levels}</span>
            <span className="text-xs font-bold uppercase tracking-wider opacity-60">Levels</span>
          </div>
          <div className="flex flex-col items-center text-ink">
            <span className="text-xl font-display font-bold">{stats.wins}</span>
            <span className="text-xs font-bold uppercase tracking-wider opacity-60">Wins</span>
          </div>
          <div className="flex flex-col items-center text-ink">
            <span className="text-xl font-display font-bold">{stats.streak}</span>
            <span className="text-xs font-bold uppercase tracking-wider opacity-60">Streak</span>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
