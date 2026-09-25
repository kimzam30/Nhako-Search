import { supabase } from '@/lib/multiplayer/supabase';

export async function getUserProfile() {
  const { data: user } = await supabase.auth.getUser();
  if (user?.user) {
    const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.user.id).maybeSingle();
    return {
      displayName: profile?.display_name || user.user.user_metadata?.name || 'Player',
      avatarUrl: profile?.avatar_url || user.user.user_metadata?.avatar_url || '',
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
  const { data: user } = await supabase.auth.getUser();
  if (user?.user) {
    const { error } = await supabase.from('profiles').upsert({
      id: user.user.id,
      display_name: safeName,
      avatar_url: user.user.user_metadata?.avatar_url,
    }, { onConflict: 'id' });
    if (error) console.error('Failed to update display name:', error);
  } else {
    localStorage.setItem('nhako_guest_name', safeName);
  }
}
