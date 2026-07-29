'use client';
import { supabase } from '@/lib/multiplayer/supabase';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ButterflySvg } from '@/components/ui/Icons';
import { motion } from 'framer-motion';

export default function SignInPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [guestName, setGuestName] = useState('');

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
    localStorage.setItem('nhako_guest_mode', 'true');
    localStorage.setItem('nhako_guest_name', trimmedName);
    router.push('/');
  };

  if (showGuestPrompt) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 bg-transparent w-full max-w-sm mx-auto min-h-screen relative">
        <h1 className="text-3xl font-display text-ink mb-2 text-center">What should we call you?</h1>
        <p className="text-ink/80 mb-8 font-body font-medium text-base text-center">
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
            className="w-full bg-surface border-2 border-ink rounded-xl px-4 py-3 font-bold text-ink outline-none text-center text-lg min-h-[52px]"
            autoFocus
          />
          <div
            id="guest-name-help"
            className="w-full flex justify-between items-center mt-2 mb-6 px-1 text-xs font-body font-bold"
          >
            <span className={trimmedName.length > 0 && !nameIsValid ? 'text-accent' : 'text-ink/50'}>
              {trimmedName.length > 0 && !nameIsValid
                ? 'At least 2 characters'
                : 'Shown to your partner'}
            </span>
            <span className="text-ink/40 tabular-nums">{guestName.length}/15</span>
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
          className="mt-6 text-ink/60 font-body font-bold underline hover:text-ink min-h-[44px]"
        >
          Back
        </button>

        <p className="text-ink/50 font-body text-xs text-center mt-6 leading-relaxed">
          Playing as a guest keeps your progress on this device only. Sign in
          with Google later to save it.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6 bg-transparent w-full max-w-sm mx-auto h-screen relative">
      <div className="flex flex-col items-center justify-center text-center z-10 w-full mb-16">
        
        {/* Doodle Illustration: Two butterflies meeting */}
        <div className="relative w-48 h-32 mb-8 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 100">
            <path 
              d="M 50 60 Q 100 80 150 60" 
              fill="none" 
              stroke="var(--ink)" 
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
        <p className="text-ink/80 mb-8 font-body font-medium text-lg leading-snug">
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
          className="w-full text-ink/70 font-body font-bold py-2 underline hover:text-ink transition-colors active:scale-95 duration-100"
        >
          Continue as guest
        </button>
      </div>
    </div>
  );
}
