import { getCurrentUser } from '@/lib/auth/session';
import { supabase } from '@/lib/multiplayer/supabase';

export async function getUserProfile() {
  const authUser = await getCurrentUser();
  if (authUser) {
    const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', authUser.id).maybeSingle();
    return {
      displayName: profile?.display_name || authUser.user_metadata?.name || 'Player',
      avatarUrl: profile?.avatar_url || authUser.user_metadata?.avatar_url || '',
      isGuest: false,
    };
  }

  // Guest
  return {
    displayName: typeof window !== 'undefined' ? localStorage.getItem('nhako_guest_name') || 'Guest' : 'Guest',
    avatarUrl: '',
    isGuest: true,
  };
}

export async function updateDisplayName(newName: string) {
  const safeName = newName.trim().slice(0, 20) || 'Player';
  const authUser = await getCurrentUser();
  if (authUser) {
    const { error } = await supabase.from('profiles').upsert({
      id: authUser.id,
      display_name: safeName,
      avatar_url: authUser.user_metadata?.avatar_url,
    }, { onConflict: 'id' });
    if (error) console.error('Failed to update display name:', error);
  } else {
    localStorage.setItem('nhako_guest_name', safeName);
  }
}
