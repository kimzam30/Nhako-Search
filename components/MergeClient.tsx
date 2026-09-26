'use client';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/multiplayer/supabase';
import { mergeGuestProgress } from '@/lib/auth/merge';
import { mergeGuestWallet } from '@/lib/rewards/wallet';
import { clearCache } from '@/lib/data/cache';
import { prefetchSummary, refreshSummary, usePlayer } from '@/lib/data/player';
import { syncAchievements } from '@/lib/rewards/achievements';
import { Species } from '@/components/butterfly/Species';
import { toast } from '@/components/ui/Toast';

/*
 * App-level data lifecycle, mounted once in the layout:
 *
 *  - warms the player summary at boot, so the first tab the player opens
 *    already has its numbers;
 *  - on sign-in, moves guest progress (and tokens) into the account;
 *  - on sign-out, drops the cached copy so the next player never sees it;
 *  - whenever the summary changes, stores any newly earned achievement
 *    butterflies and announces them.
 */
/** Each butterfly is announced once, however many syncs report it. */
const announcedIds = new Set<string>();

async function mergeAll() {
  const moved = await Promise.all([mergeGuestProgress(), mergeGuestWallet()]);
  if (moved.some(Boolean)) refreshSummary();
}

export function MergeClient() {
  const { summary } = usePlayer();

  useEffect(() => {
    void prefetchSummary();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        void mergeAll();
      }
      if (event === 'SIGNED_OUT') clearCache();
    });
    // Also on mount, in case a sign-in finished before this listener existed.
    void mergeAll();
    return () => subscription.unsubscribe();
  }, []);

  // Achievements: evaluated against every fresh summary. For the first few
  // seconds of a session nothing is announced — a returning player's backlog
  // (cached summary, then the fresh one) is stored quietly rather than as a
  // burst of toasts over the home screen.
  const bootedAt = useRef(0);
  useEffect(() => {
    bootedAt.current = Date.now();
  }, []);
  useEffect(() => {
    if (!summary) return;
    void syncAchievements(summary).then(won => {
      const fresh = won.filter(a => !announcedIds.has(a.id));
      fresh.forEach(a => announcedIds.add(a.id));
      if (Date.now() - bootedAt.current < 6000) return;
      fresh.forEach(a =>
        toast({
          title: `New butterfly: ${a.species}`,
          body: `${a.title} · +15 tokens`,
          icon: <Species spec={a.spec} className="w-10" />,
        })
      );
    });
  }, [summary]);

  return null;
}
