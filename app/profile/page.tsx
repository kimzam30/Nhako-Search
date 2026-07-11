'use client';
import { supabase } from '@/lib/multiplayer/supabase';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import { ButterflySvg, CloseSvg, StarSvg } from '@/components/ui/Icons';
import { Card } from '@/components/ui/Card';

export default function ProfilePage() {
  const [collection, setCollection] = useState<any[]>([]);
  const [selectedButterfly, setSelectedButterfly] = useState<any | null>(null);

  useEffect(() => {
    async function loadCollection() {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { data } = await supabase.from('butterfly_collection').select('*').eq('user_id', user.user.id);
        setCollection(data || []);
      } else {
        const saved = JSON.parse(localStorage.getItem('nhako_collection') || '[]');
        setCollection(saved);
      }
    }
    loadCollection();
  }, []);

  const totalSlots = 30; // 30 possible slots for the album

  return (
    <div className="flex flex-col flex-1 p-4 bg-transparent items-center w-full max-w-lg mx-auto pb-32 pt-8">
      
      {/* Core Stats */}
      <h1 className="text-4xl font-display text-ink mb-6 w-full text-center">Your Profile</h1>
      
      <Card className="w-full mb-8 bg-surface">
        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
          <div className="flex flex-col">
            <span className="text-3xl font-display font-bold text-ink">12</span>
            <span className="text-xs font-bold uppercase tracking-widest text-ink/60">Levels Done</span>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-display font-bold text-ink">142</span>
            <span className="text-xs font-bold uppercase tracking-widest text-ink/60">Words Found</span>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-display font-bold text-ink">4-1</span>
            <span className="text-xs font-bold uppercase tracking-widest text-ink/60">Race Record</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-display font-bold text-ink">12</span>
              <span className="text-sm font-display font-bold text-ink/40 pb-1">/ 15 best</span>
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
              return (
                <motion.button 
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.05, ...softBounce }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedButterfly(b)}
                  className="aspect-square rounded-2xl bg-white border-2 border-ink shadow-[2px_2px_0_0_var(--ink)] flex flex-col items-center justify-center cursor-pointer relative"
                  style={{ borderRadius: `${12 + (i%5)}px ${18 - (i%3)}px ${14 + (i%4)}px ${16 - (i%2)}px` }}
                >
                  <ButterflySvg className="w-8 h-8 text-accent drop-shadow-sm" />
                  {/* Sparkle badge for 'new' */}
                  {i === 0 && (
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="absolute -top-2 -right-2 bg-gold border-2 border-ink w-6 h-6 flex items-center justify-center rounded-full"
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
              <ButterflySvg className="w-20 h-20 text-accent mb-6" />
              <h3 className="text-2xl font-display text-ink mb-2">Monarch</h3>
              <p className="text-ink/70 font-body mb-2">Earned from <strong>{selectedButterfly.earned_from || 'Garden - Level 4'}</strong></p>
              <p className="text-ink/50 font-body text-sm">{new Date(selectedButterfly.earned_at || Date.now()).toLocaleDateString()}</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
