'use client';
import { usePathname } from 'next/navigation';
import { isChromeless, isGameplayRoute } from '@/lib/nav/routes';

export function SignatureFooter() {
  const pathname = usePathname();

  if (!pathname) return null;

  // Hidden during gameplay and on the sign-in screen, which is chromeless.
  if (isGameplayRoute(pathname) || isChromeless(pathname)) return null;
  // Home is a full-screen lobby laid out to end exactly at the tab bar.
  if (pathname === '/') return null;

  return (
    <div 
      className="w-full py-6 flex justify-center items-center mt-auto" aria-hidden="true"
    >
      <span 
        className="font-accent text-xl text-ink-2"
        style={{ transform: 'rotate(-2deg)' }}
      >
        a little garden, made by kimzam
      </span>
    </div>
  );
}
