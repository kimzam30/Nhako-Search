'use client';
import { supabase } from '@/lib/multiplayer/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ButterflySvg } from '@/components/ui/Icons';
import { motion } from 'framer-motion';

export default function SignInPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [guestName, setGuestName] = useState('');

  // Signing in is a one-way door: someone who already has a session never
  // sees this screen, and Back from Home can never land on it again.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) router.replace('/');
    });
  }, [router]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    
    if (error) {
      console.error('Error signing in:', error.message);
      setErrorMsg('Oops, something went wrong. Let\'s try again.');
      setLoading(false);
    }
  };

  const handleGuestContinue = () => {
    setShowGuestPrompt(true);
  };

  const trimmedName = guestName.trim();
  const nameIsValid = trimmedName.length >= 2;

  const confirmGuest = () => {
    if (!nameIsValid) return;
    try {
      localStorage.setItem('nhako_guest_mode', 'true');
      localStorage.setItem('nhako_guest_name', trimmedName);
    } catch {
      /* private mode: the name lasts for this visit only */
    }
    router.replace('/');
  };

  if (showGuestPrompt) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 bg-transparent w-full max-w-sm mx-auto min-h-dvh relative" style={{ paddingTop: 'max(1.5rem, var(--safe-top))', paddingBottom: 'max(1.5rem, var(--safe-bottom))' }}>
        <h1 className="text-3xl font-display text-ink mb-2 text-center">What should we call you?</h1>
        <p className="text-ink-2 mb-8 font-body font-bold text-base text-center">
          Your partner sees this name when you race.
        </p>

        {/* Submitting on Enter matters here: the on-screen keyboard covers the
            button on a phone, so tapping "Go" was a dead end. */}
        <form
          className="w-full flex flex-col items-center"
          onSubmit={e => {
            e.preventDefault();
            confirmGuest();
          }}
        >
          <label htmlFor="guest-name" className="sr-only">
            Display name
          </label>
          <input
            id="guest-name"
            type="text"
            value={guestName}
            onChange={e => setGuestName(e.target.value.replace(/\s{2,}/g, ' '))}
            placeholder="e.g. Kim"
            maxLength={15}
            enterKeyHint="go"
            autoComplete="nickname"
            autoCapitalize="words"
            aria-describedby="guest-name-help"
            className="w-full bg-surface border-2 border-line rounded-xl px-4 py-3 font-bold text-ink outline-none focus:border-accent text-center text-lg min-h-[52px]"
            autoFocus
          />
          <div
            id="guest-name-help"
            className="w-full flex justify-between items-center mt-2 mb-6 px-1 text-xs font-body font-bold"
          >
            <span className={trimmedName.length > 0 && !nameIsValid ? 'text-accent-ink' : 'text-ink-2'}>
              {trimmedName.length > 0 && !nameIsValid
                ? 'At least 2 characters'
                : 'Shown to your partner'}
            </span>
            <span className="text-ink-2 tabular-nums">{guestName.length}/15</span>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={!nameIsValid}
            className={nameIsValid ? '' : 'opacity-50'}
          >
            Start Playing
          </Button>
        </form>

        <button
          onClick={() => setShowGuestPrompt(false)}
          className="press mt-4 px-4 text-ink-2 font-body font-bold underline min-h-[48px]"
        >
          Back
        </button>

        <p className="text-ink-2 font-body text-sm text-center mt-6 leading-relaxed">
          Playing as a guest keeps your progress on this device only. Sign in
          with Google later to save it.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6 bg-transparent w-full max-w-sm mx-auto min-h-dvh relative" style={{ paddingTop: 'max(1.5rem, var(--safe-top))', paddingBottom: 'max(1.5rem, var(--safe-bottom))' }}>
      <div className="flex flex-col items-center justify-center text-center z-10 w-full mb-16">
        
        {/* Doodle Illustration: Two butterflies meeting */}
        <div className="relative w-48 h-32 mb-8 flex items-center justify-center">
          <svg aria-hidden="true" className="absolute inset-0 w-full h-full" viewBox="0 0 200 100">
            <path 
              d="M 50 60 Q 100 80 150 60" 
              fill="none" 
              stroke="var(--line)" 
              strokeWidth="2" 
              strokeDasharray="4 4" 
              className="opacity-40"
            />
          </svg>
          <motion.div 
            animate={{ y: [0, -4, 0], rotate: 5 }} 
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute left-[30px] top-[40px] text-accent"
          >
            <ButterflySvg className="w-10 h-10 -scale-x-100" />
          </motion.div>
          <motion.div 
            animate={{ y: [0, 4, 0], rotate: -15 }} 
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="absolute right-[30px] top-[20px] text-gold"
          >
            <ButterflySvg className="w-12 h-12" />
          </motion.div>
        </div>

        <h1 className="text-3xl font-display text-ink mb-2">Welcome</h1>
        <p className="text-ink-2 mb-8 font-body font-bold text-lg leading-snug">
          Save your collection and <br/> race your favorite person.
        </p>

        {errorMsg && (
          <p className="text-ink font-bold mb-4 bg-surface px-4 py-2 rounded-xl border border-ink/20">
            {errorMsg}
          </p>
        )}

        <Button 
          variant="primary" 
          fullWidth 
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="mb-4"
        >
          {loading ? 'Opening...' : 'Sign in with Google'}
        </Button>
        
        <button 
          onClick={handleGuestContinue}
          className="press w-full min-h-[48px] text-ink-2 font-body font-bold underline"
        >
          Continue as guest
        </button>
      </div>
    </div>
  );
}
