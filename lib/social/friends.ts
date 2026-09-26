import { supabase } from '@/lib/multiplayer/supabase';
import { getCurrentUser } from '@/lib/auth/session';
import { invalidate } from '@/lib/data/cache';
import { refreshSummary } from '@/lib/data/player';

/*
 * Friends and the friend leaderboard (migration 005).
 *
 * Requests, accepts and codes all go through RPCs, so nobody can accept a
 * request on someone else's behalf; the leaderboard is computed server-side
 * from the real game tables, so a player's numbers cannot be self-reported.
 */

export interface FriendRow {
  user_id: string;
  display_name: string;
  avatar_url: string;
  status: 'pending' | 'accepted';
  incoming: boolean;
  since: string;
}

export interface BoardRow {
  user_id: string;
  display_name: string;
  avatar_url: string;
  is_me: boolean;
  stars: number;
  levels: number;
  daily_days: number;
  streak: number;
  best_streak: number;
  race_wins: number;
  races: number;
  butterflies: number;
  tokens_lifetime: number;
}

export type RequestResult = 'sent' | 'accepted' | 'already' | 'self' | 'not_found' | 'error' | 'signed_out';

export const friendsKey = (uid: string) => `friends:${uid}`;
export const boardKey = (uid: string) => `board:${uid}`;
export const codeKey = (uid: string) => `code:${uid}`;

export async function fetchFriends(): Promise<FriendRow[]> {
  const { data, error } = await supabase.rpc('list_friends');
  if (error) throw error;
  return (data ?? []) as FriendRow[];
}

export async function fetchLeaderboard(): Promise<BoardRow[]> {
  const { data, error } = await supabase.rpc('friend_leaderboard');
  if (error) throw error;
  return (data ?? []) as BoardRow[];
}

export async function fetchMyCode(): Promise<string> {
  const { data, error } = await supabase.rpc('my_friend_code');
  if (error) throw error;
  return data as string;
}

export async function fetchFriendAlbum(friendId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('friend_album', { friend: friendId });
  if (error) throw error;
  return ((data ?? []) as { butterfly_style_id: string }[]).map(r => r.butterfly_style_id);
}

function refreshSocial() {
  invalidate('friends:');
  invalidate('board:');
  refreshSummary();
}

/** Friend codes are 6 characters from an alphabet without look-alikes. */
export function normaliseCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export async function requestByCode(code: string): Promise<RequestResult> {
  if (!(await getCurrentUser())) return 'signed_out';
  const { data, error } = await supabase.rpc('request_friend_by_code', { code: normaliseCode(code) });
  if (error) return 'error';
  refreshSocial();
  return data as RequestResult;
}

/** Used after a race: add the partner you just played. */
export async function requestById(userId: string): Promise<RequestResult> {
  if (!(await getCurrentUser())) return 'signed_out';
  const { data, error } = await supabase.rpc('request_friend', { target: userId });
  if (error) return 'error';
  refreshSocial();
  return data as RequestResult;
}

export async function respond(requesterId: string, accept: boolean): Promise<boolean> {
  const { error } = await supabase.rpc('respond_friend', { requester_id: requesterId, accept });
  refreshSocial();
  return !error;
}

/** Unfriend, withdraw a sent request, or decline one: either side may. */
export async function removeFriend(otherId: string): Promise<boolean> {
  const me = await getCurrentUser();
  if (!me) return false;
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(requester.eq.${me.id},addressee.eq.${otherId}),and(requester.eq.${otherId},addressee.eq.${me.id})`);
  refreshSocial();
  return !error;
}

export const REQUEST_MESSAGES: Record<RequestResult, string> = {
  sent: 'Request sent. They will see it on their Friends page.',
  accepted: 'You are now friends!',
  already: 'You are already friends, or a request is waiting.',
  self: 'That is your own code.',
  not_found: 'No player has that code. Check the letters.',
  error: 'Could not send that right now. Try again in a moment.',
  signed_out: 'Sign in to add friends.',
};
