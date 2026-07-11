'use client';

import { supabase } from '@/lib/multiplayer/supabase';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    
    if (error) {
      console.error('Error signing in:', error.message);
      alert('Failed to sign in. Please try again.');
    }
  };

  const handleGuestContinue = () => {
    // Guest logic: set a flag in local storage, etc.
    localStorage.setItem('nhako_guest_mode', 'true');
    router.push('/');
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4 bg-background">
      <div className="bg-surface p-8 rounded-3xl text-center max-w-sm w-full border-2 border-ink">
        <h1 className="text-4xl font-display text-ink mb-2">NhakoSearch</h1>
        <p className="text-ink mb-8 font-body">Save your progress and race your favorite person.</p>
        
        <button 
          onClick={handleGoogleSignIn}
          className="w-full bg-accent text-ink font-body font-bold py-3 px-4 rounded-xl mb-4 hover:bg-accent-soft transition-colors shadow-sm active:scale-95 transform duration-100 min-h-[44px]"
        >
          Sign in with Google
        </button>
        
        <button 
          onClick={handleGuestContinue}
          className="w-full text-ink font-body underline opacity-80 hover:opacity-100 transition-opacity min-h-[44px] flex items-center justify-center"
        >
          Continue as guest
        </button>
      </div>
    </div>
  );
}
