'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/multiplayer/supabase';
import { FlameSvg, HomeSvg, MapSvg, RaceSvg, UserSvg } from '@/components/ui/Icons';
import { isChromeless, isGameplayRoute } from '@/lib/nav/routes';

interface Tab {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
}

/*
 * The app's tab bar: bottom bar on phones and tablets, left rail from 1024px.
 *
 * Replaces the floating pill, whose links were raw <a> tags (every tap was a
 * full page reload that also killed the ambience) and had no accessible names.
 * Tabs are peers: no transition between them, the active one is marked with
 * aria-current, and tapping it again scrolls back to the top.
 */
export function TabBar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!pathname || isChromeless(pathname) || isGameplayRoute(pathname)) return null;

  const avatar = user?.user_metadata?.avatar_url as string | undefined;
  const tabs: Tab[] = [
    { href: '/daily', label: 'Daily', icon: <FlameSvg className="w-[24px] h-[24px]" />, active: pathname.startsWith('/daily') },
    { href: '/level-path', label: 'Levels', icon: <MapSvg className="w-[24px] h-[24px]" />, active: pathname.startsWith('/level-path') },
    { href: '/', label: 'Home', icon: <HomeSvg className="w-[24px] h-[24px]" />, active: pathname === '/' },
    { href: '/play/race/lobby', label: 'Race', icon: <RaceSvg className="w-[24px] h-[24px]" />, active: pathname.startsWith('/play/race') },
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
          className="w-[26px] h-[26px] rounded-full border-2 border-ink object-cover"
        />
      ) : (
        <UserSvg className="w-[24px] h-[24px]" />
      ),
      active: pathname.startsWith('/profile') || pathname.startsWith('/settings'),
    },
  ];

  return (
    <>
      {/* In-flow spacer: reserves the bar's height so no page content ever
          sits under it, whatever the page's own padding. */}
      <div className="tabbar-spacer" aria-hidden="true" />
      <nav className="tabbar bg-surface border-t-2 border-ink lg:border-t-0 lg:border-r-2" aria-label="Main">
        <ul className="flex lg:flex-col h-[var(--tabbar-h)] lg:h-full lg:pt-8 lg:gap-2 max-w-xl mx-auto lg:max-w-none">
          {tabs.map(tab => (
            <li key={tab.href} className="flex-1 min-w-0 lg:flex-none">
              <Link
                href={tab.href}
                aria-current={tab.active ? 'page' : undefined}
                onClick={e => {
                  // Native tab behaviour: re-tapping the active tab returns to the top.
                  if (tab.active && pathname === tab.href) {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`press flex flex-col items-center justify-center gap-[2px] h-full lg:h-auto lg:py-2 min-h-[48px] min-w-0 px-0.5 font-body text-[11px] font-extrabold tracking-wide ${
                  tab.active ? 'text-ink' : 'text-ink-2'
                }`}
              >
                {/* Pill sized in px and capped by its column: at large text
                    sizes rem-based pills overflowed five-across on a phone. */}
                <span
                  className={`flex items-center justify-center w-full max-w-[56px] h-[32px] rounded-full transition-colors duration-150 ${
                    tab.active ? 'bg-accent-soft' : ''
                  }`}
                >
                  {tab.icon}
                </span>
                <span className="max-w-full truncate">{tab.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
