'use client';
import { supabase } from '@/lib/multiplayer/supabase';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import { ButterflySvg } from '@/components/ui/Icons';

export default function ProfilePage() {
  const [collection, setCollection] = useState<any[]>([]);

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

  return (
    <div className="flex flex-col flex-1 p-4 bg-background items-center mx-auto w-full max-w-lg pb-10">
      <h1 className="text-3xl font-display text-ink mb-6 border-b-2 border-ink/10 pb-4 w-full text-center">Butterfly Collection</h1>
      
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 w-full">
        {collection.map((b, i) => (
          <motion.div 
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.05, ...softBounce }}
            className="w-16 h-16 rounded-xl bg-surface border-2 border-ink/20 flex flex-col items-center justify-center cursor-pointer hover:bg-accent-soft group"
            title={`Earned from ${b.earned_from} at ${new Date(b.earned_at).toLocaleDateString()}`}
          >
            <div className="group-hover:scale-110 transition-transform">
              <ButterflySvg className="w-8 h-8 text-accent drop-shadow-sm" />
            </div>
          </motion.div>
        ))}
        
        {collection.length === 0 && (
          <div className="col-span-full text-ink opacity-60 text-center py-8 font-body">
            You haven't collected any butterflies yet.<br/>Play some levels or the daily challenge to start your collection!
          </div>
        )}
      </div>
    </div>
  );
}
