'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/multiplayer/supabase';
import { mergeGuestProgress } from '@/lib/auth/merge';

export function MergeClient() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        mergeGuestProgress();
      }
    });

    // Also check on mount in case they are already signed in but haven't merged
    mergeGuestProgress();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
