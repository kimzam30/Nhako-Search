'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useCurrentUser } from '@/lib/auth/session';
import { prefetchSummary, usePlayer } from '@/lib/data/player';
import { FlameSvg, HomeSvg, MapSvg, RaceSvg, UserSvg } from '@/components/ui/Icons';
import { isChromeless, isGameplayRoute } from '@/lib/nav/routes';

interface Tab {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
}

/*
 * The app's tab bar: bottom bar on phones and tablets, left rail from 1024px
 * and on a phone held in landscape (the `rail:` variant).
 *
 * Replaces the floating pill, whose links were raw <a> tags (every tap was a
 * full page reload that also killed the ambience) and had no accessible names.
 * Tabs are peers: no transition between them, the active one is marked with
 * aria-current, and tapping it again scrolls back to the top.
 */
export function TabBar() {
  const pathname = usePathname();
  const user = useCurrentUser();
  // Friend requests waiting show as a dot on the You tab.
  const { summary } = usePlayer();

  if (!pathname || isChromeless(pathname) || isGameplayRoute(pathname)) return null;

  const avatar = user?.user_metadata?.avatar_url as string | undefined;
  const tabs: Tab[] = [
    { href: '/daily', label: 'Daily', icon: <FlameSvg className="w-[24px] h-[24px]" />, active: pathname.startsWith('/daily') },
    { href: '/level-path', label: 'Levels', icon: <MapSvg className="w-[24px] h-[24px]" />, active: pathname.startsWith('/level-path') },
    { href: '/', label: 'Home', icon: <HomeSvg className="w-[24px] h-[24px]" />, active: pathname === '/' },
    { href: '/play/race/lobby', label: 'Multiplayer', icon: <RaceSvg className="w-[24px] h-[24px]" />, active: pathname.startsWith('/play/race') },
    {
      href: '/profile',
      label: 'You',
      icon: avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- Google CDN avatar; next/image would proxy it through the paid optimiser.
        <img
          src={avatar}
          alt=""
          width={26}
          height={26}
          referrerPolicy="no-referrer"
          className="w-[26px] h-[26px] rounded-full border-2 border-line object-cover"
        />
      ) : (
        <UserSvg className="w-[24px] h-[24px]" />
      ),
      active: ['/profile', '/settings', '/album', '/friends'].some(p => pathname.startsWith(p)),
    },
  ];

  return (
    <>
      {/* In-flow spacer: reserves the bar's height so no page content ever
          sits under it, whatever the page's own padding. */}
      <div className="tabbar-spacer" aria-hidden="true" />
      <nav className="tabbar bg-surface border-t-2 border-line rail:border-t-0 rail:border-r-2" aria-label="Main">
        <ul className="flex rail:flex-col items-stretch h-[var(--tabbar-h)] rail:h-full rail:pt-8 rail:gap-3 max-w-xl mx-auto rail:max-w-none">
          {tabs.map(tab => {
            // Home is the dock's raised centre button, like a game's main
            // "play" slot; the others are flat tabs with a sticker pill.
            const isHome = tab.href === '/';
            return (
              <li key={tab.href} className="flex-1 min-w-0 rail:flex-none">
                <Link
                  href={tab.href}
                  aria-current={tab.active ? 'page' : undefined}
                  // Warm the data on press-in, so the screen opens with it.
                  onPointerDown={() => void prefetchSummary()}
                  onClick={e => {
                    // Native tab behaviour: re-tapping the active tab returns to the top.
                    if (tab.active && pathname === tab.href) {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={`press flex flex-col items-center justify-center gap-[2px] h-full rail:h-auto rail:py-2 min-h-[48px] min-w-0 px-0.5 font-body text-[11px] font-extrabold tracking-wide ${
                    tab.active ? 'text-ink' : 'text-ink-2'
                  }`}
                >
                  {isHome ? (
                    <motion.span
                      className={`flex items-center justify-center w-[52px] h-[52px] -mt-6 rail:mt-0 border-2 border-line shadow-[3px_4px_0_0_var(--line)] transition-colors duration-150 ${
                        tab.active ? 'bg-accent text-on-accent' : 'bg-accent-soft text-ink'
                      }`}
                      style={{ borderRadius: '63% 37% 54% 46% / 55% 45% 62% 38%' }}
                      animate={tab.active ? { scale: [1, 1.12, 1], rotate: [0, -6, 0] } : { scale: 1, rotate: 0 }}
                      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                    >
                      {tab.icon}
                    </motion.span>
                  ) : (
                    /* Pill sized in px and capped by its column: at large text
                       sizes rem-based pills overflowed five-across on a phone. */
                    <span className="relative flex items-center justify-center w-full max-w-[56px] h-[32px]">
                      {/* One pill that slides to whichever tab is active. */}
                      {tab.active && (
                        <motion.span
                          layoutId="tab-pill"
                          className="absolute inset-0 rounded-full border-2 border-line bg-accent-soft"
                          transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                          aria-hidden="true"
                        />
                      )}
                      {/* The icon hops once as its tab becomes active. */}
                      <motion.span
                        className="relative flex"
                        animate={tab.active ? { y: [0, -5, 0], rotate: [0, -8, 0] } : { y: 0, rotate: 0 }}
                        transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
                      >
                        {tab.icon}
                      </motion.span>
                      {tab.href === '/profile' && (summary?.pendingRequests ?? 0) > 0 && (
                        <span className="absolute top-0 right-2 w-3 h-3 rounded-full bg-accent border-2 border-line" aria-hidden="true" />
                      )}
                    </span>
                  )}
                  <span className="max-w-full truncate">{tab.label}</span>
                  {tab.href === '/profile' && (summary?.pendingRequests ?? 0) > 0 && (
                    <span className="sr-only">, {summary!.pendingRequests} friend requests</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
