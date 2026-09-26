'use client';
import { useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/multiplayer/supabase';
import { useCurrentUser } from '@/lib/auth/session';
import { refreshSocial } from '@/lib/social/friends';
import { toast } from '@/components/ui/Toast';
import { UserPlusSvg } from '@/components/ui/Icons';

/*
 * Live friend news, mounted once in the layout.
 *
 * The database pushes every change to a player's friendships onto their own
 * private Realtime topic, `user:<id>` (migration 006; RLS lets each player
 * join only their own). Here that becomes: the friend views and the tab-bar
 * badge refresh at once, and a request or an accept is announced with a toast
 * that opens the Friends page — no refresh needed on either side.
 *
 * If the socket drops, Supabase rejoins on its own; on every (re)join the
 * friend data is refetched, so nothing sent while offline is missed.
 */

interface FriendEvent {
  other: string;
  name?: string;
  avatar?: string;
}

function Face({ name, avatar }: { name?: string; avatar?: string }) {
  return (
    <span className="relative w-10 h-10 rounded-full border-2 border-line bg-accent-soft overflow-hidden flex items-center justify-center font-display text-lg text-ink">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- Google CDN avatar
        <img src={avatar} alt="" width={40} height={40} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
      ) : name ? (
        name.charAt(0).toUpperCase()
      ) : (
        <UserPlusSvg className="w-5 h-5" />
      )}
    </span>
  );
}

export function FriendLive() {
  const user = useCurrentUser();
  const uid = user?.id;

  useEffect(() => {
    if (!uid) return;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let joinedBefore = false;

    void (async () => {
      // Private channels authorise with the player's access token.
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase
        .channel(`user:${uid}`, { config: { private: true } })
        .on('broadcast', { event: 'friend_request' }, ({ payload }) => {
          const e = payload as FriendEvent;
          refreshSocial();
          toast({
            title: 'Friend request',
            body: `${e.name || 'A player'} wants to be friends`,
            icon: <Face name={e.name} avatar={e.avatar} />,
            href: '/friends',
            ms: 7000,
          });
        })
        .on('broadcast', { event: 'friend_accepted' }, ({ payload }) => {
          const e = payload as FriendEvent;
          refreshSocial();
          toast({
            title: `${e.name || 'A player'} is now your friend`,
            body: 'See how you compare on the leaderboard',
            icon: <Face name={e.name} avatar={e.avatar} />,
            href: '/friends',
            ms: 7000,
          });
        })
        .on('broadcast', { event: 'friends_changed' }, () => refreshSocial())
        .subscribe(status => {
          if (status !== 'SUBSCRIBED') return;
          // A rejoin after a dropped connection: catch up on anything missed.
          if (joinedBefore) refreshSocial();
          joinedBefore = true;
        });
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [uid]);

  return null;
}
