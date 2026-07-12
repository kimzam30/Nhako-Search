import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/multiplayer/supabase';
import { useRouter } from 'next/navigation';

export interface PlayerState {
  id: string;
  name: string;
  difficulty: string;
  isReady: boolean;
  isLeader: boolean;
  progress: number;
  total: number;
  foundWords: string[];
}

export interface RaceState {
  playerA?: PlayerState;
  playerB?: PlayerState;
  status: 'lobby' | 'countdown' | 'playing' | 'finished';
  startTime?: number;
  seedStr?: string;
  winner?: string;
}

export function useRaceRoom(roomCode: string, userId: string, userName: string) {
  const router = useRouter();
  const isLeader = typeof window !== 'undefined' ? sessionStorage.getItem('is_leader_' + roomCode) === 'true' : false;

  const [raceState, setRaceState] = useState<RaceState>({ 
    status: 'lobby',
    playerA: { id: userId, name: userName, difficulty: 'medium', isReady: isLeader, isLeader, progress: 0, total: 8, foundWords: [] }
  });
  
  const myStateRef = useRef<PlayerState>({ 
    id: userId, name: userName, difficulty: 'medium', isReady: isLeader, isLeader, progress: 0, total: 8, foundWords: [] 
  });
  
  const [chatMessages, setChatMessages] = useState<{ id: string, text: string, sender: string, time: number }[]>([]);
  const channelRef = useRef<any>(null);

  // The old host election effect is removed. Leader triggers start manually.

  useEffect(() => {
    const channel = supabase.channel(`room:${roomCode}`, {
      config: { presence: { key: userId } }
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        
        // Extract the other player's state from the Presence object
        let otherPlayerState: PlayerState | undefined;
        let leaderIsPresent = false;

        for (const [key, presences] of Object.entries(state)) {
          if (presences.length > 0) {
            const presenceData = presences[0] as any;
            if (presenceData.state) {
              if (key !== userId) {
                otherPlayerState = presenceData.state;
              }
              if (presenceData.state.isLeader) {
                leaderIsPresent = true;
              }
            }
          }
        }

        setRaceState(prev => {
          if (!otherPlayerState) return prev;
          return { ...prev, playerB: otherPlayerState };
        });

        // Safe router.push outside of state updater
        if (!isLeader && !leaderIsPresent) {
           // We only kick if we have seen a leader before or if they never existed and we've been here a while.
           // Since leader always creates the room, if leader is gone, room is dead.
           setTimeout(() => router.push('/play/race/lobby'), 0);
        }
      })
      .on('broadcast', { event: 'room_closed' }, () => {
        if (!isLeader) {
          router.push('/play/race/lobby');
        }
      })
      .on('broadcast', { event: 'state_update' }, (payload) => {
        // Fast dual-sync receiver for instant UI updates
        setRaceState(prev => {
          if (payload.id === userId) return prev;
          
          let isA = false;
          if (prev.playerA?.id === payload.id) isA = true;
          else if (prev.playerB?.id === payload.id) isA = false;
          else if (prev.playerA?.id === userId) isA = false;
          else isA = true;
          
          const key = isA ? 'playerA' : 'playerB';
          const newState = { ...prev, [key]: payload.state };
          
          return { ...prev, [key]: payload.state };
        });
      })
      .on('broadcast', { event: 'countdown_start' }, (payload) => {
        setRaceState(prev => ({
          ...prev,
          status: 'countdown',
          startTime: payload.startAt,
          seedStr: payload.seedStr
        }));
      })
      .on('broadcast', { event: 'game_start' }, (payload) => {
        setRaceState(prev => ({
          ...prev,
          status: 'playing'
        }));
      })
      .on('broadcast', { event: 'game_over' }, (payload) => {
        setRaceState(prev => ({ ...prev, status: 'finished', winner: payload.winner }));
      })
      .on('broadcast', { event: 'chat_message' }, (payload) => {
        const id = Math.random().toString();
        setChatMessages(prev => [...prev, { id, text: payload.content, sender: payload.playerId, time: Date.now() }]);
        setTimeout(() => {
          setChatMessages(prev => prev.filter(m => m.id !== id));
        }, 3000);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Initialize our own presence state so late-joiners can fetch it
          await channel.track({ online_at: new Date().toISOString(), state: myStateRef.current });
        }
      });

    return () => {
      if (isLeader) {
        channel.send({ type: 'broadcast', event: 'room_closed', payload: {} });
        setTimeout(() => supabase.removeChannel(channel), 100);
      } else {
        supabase.removeChannel(channel);
      }
    };
  }, [roomCode, userId, userName, isLeader, router]);

  useEffect(() => {
    if (raceState.status === 'countdown' && isLeader) {
      const interval = setInterval(() => {
        if (Date.now() >= raceState.startTime!) {
          channelRef.current?.send({ type: 'broadcast', event: 'game_start', payload: { startedBy: userId } });
          setRaceState(prev => ({ ...prev, status: 'playing' }));
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }

    if (raceState.status === 'playing' && raceState.startTime) {
      // Find leader's difficulty for timer
      const leaderDiff = raceState.playerA?.isLeader ? raceState.playerA.difficulty : (raceState.playerB?.isLeader ? raceState.playerB.difficulty : 'medium');
      const durationSecs = leaderDiff === 'easy' ? 180 : leaderDiff === 'medium' ? 150 : 120;
      const endTime = raceState.startTime + durationSecs * 1000;

      const interval = setInterval(() => {
        const pA = myStateRef.current;
        const pB = raceState.playerA?.id === userId ? raceState.playerB : raceState.playerA;

        // Check if someone won
        if (pA.progress >= pA.total && pA.total > 0) {
          channelRef.current?.send({ type: 'broadcast', event: 'game_over', payload: { winner: pA.id } });
          setRaceState(prev => ({ ...prev, status: 'finished', winner: pA.id }));
          clearInterval(interval);
        } else if (pB && pB.progress >= pB.total && pB.total > 0) {
          // If we receive the state_update that B finished, we don't need to broadcast
          setRaceState(prev => ({ ...prev, status: 'finished', winner: pB.id }));
          clearInterval(interval);
        } else if (Date.now() >= endTime) {
          // Time's up! Tie breaker by progress
          const pA_score = pA.progress / (pA.total || 1);
          const pB_score = pB ? (pB.progress / (pB.total || 1)) : 0;
          const winnerId = pA_score >= pB_score ? pA.id : pB!.id;
          if (isLeader) {
            channelRef.current?.send({ type: 'broadcast', event: 'game_over', payload: { winner: winnerId } });
          }
          setRaceState(prev => ({ ...prev, status: 'finished', winner: winnerId }));
          clearInterval(interval);
        }
      }, 250);
      return () => clearInterval(interval);
    }
  }, [raceState.status, raceState.startTime, raceState.playerA, raceState.playerB, isLeader, userId]);

  const updateMyState = (partialState: Partial<PlayerState>) => {
    const newMyState = { ...myStateRef.current, ...partialState };
    myStateRef.current = newMyState;
    
    setRaceState(prev => {
      const isA = prev.playerA?.id === userId;
      const key = isA ? 'playerA' : 'playerB';
      
      // 1. Fast broadcast for immediate UI response on the other client
      channelRef.current?.send({
        type: 'broadcast',
        event: 'state_update',
        payload: { id: userId, state: newMyState }
      });

      // 2. Fallback tracking in Presence for reliable lobby sync
      if (prev.status === 'lobby') {
        channelRef.current?.track({ online_at: new Date().toISOString(), state: newMyState });
      }
      
      return { ...prev, [key]: newMyState };
    });
  };

  const sendChat = (text: string) => {
    const safeText = text.slice(0, 50);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: { content: safeText, playerId: userId, type: 'quick', timestamp: Date.now() }
    });
    const id = Math.random().toString();
    setChatMessages(prev => [...prev, { id, text: safeText, sender: userId, time: Date.now() }]);
    setTimeout(() => {
      setChatMessages(prev => prev.filter(m => m.id !== id));
    }, 3000);
  };

  const startRaceAsLeader = () => {
    if (!isLeader) return;
    const seedStr = Math.random().toString(36).substring(2);
    const startAt = Date.now() + 3000;
    channelRef.current?.send({ type: 'broadcast', event: 'countdown_start', payload: { startAt, seedStr } });
    
    setRaceState(prev => ({
      ...prev,
      status: 'countdown',
      startTime: startAt,
      seedStr: seedStr
    }));
  };

  return { raceState, updateMyState, chatMessages, sendChat, startRaceAsLeader };
}
