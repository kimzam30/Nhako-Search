'use client';
import { usePathname } from 'next/navigation';

export function SignatureFooter() {
  const pathname = usePathname();

  if (!pathname) return null;

  const isHidden = pathname === '/sign-in';
  
  const isLevelGameplay = pathname.startsWith('/level-path/') && pathname !== '/level-path';
  const isRaceGameplay = pathname.match(/^\/play\/race\/[^\/]+$/) && !pathname.endsWith('/lobby') && !pathname.endsWith('/ready') && !pathname.endsWith('/results');
  const isStandardGameplay = pathname.startsWith('/play/standard/');

  const isMinimized = isLevelGameplay || isRaceGameplay || isStandardGameplay;

  // Hidden during active gameplay to keep screen focused.
  if (isMinimized) return null;

  return (
    <div 
      className={`w-full py-8 flex justify-center items-center opacity-60 ${isHidden ? 'fixed bottom-4' : 'mt-auto'}`}
    >
      <span 
        className="font-accent text-xl text-ink"
        style={{ transform: 'rotate(-2deg)' }}
      >
        a little garden, made by kimzam
      </span>
    </div>
  );
}
