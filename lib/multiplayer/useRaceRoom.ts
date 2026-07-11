import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/multiplayer/supabase';

export interface PlayerState {
  id: string;
  name: string;
  difficulty: string;
  isLeader: boolean;
  progress: number;
  total: number;
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
  const isLeader = typeof window !== 'undefined' ? sessionStorage.getItem('is_leader_' + roomCode) === 'true' : false;

  const [raceState, setRaceState] = useState<RaceState>({ 
    status: 'lobby',
    playerA: { id: userId, name: userName, difficulty: 'medium', isLeader, progress: 0, total: 8 }
  });
  
  const myStateRef = useRef<PlayerState>({ 
    id: userId, name: userName, difficulty: 'medium', isLeader, progress: 0, total: 8 
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
        for (const [key, presences] of Object.entries(state)) {
          if (key !== userId && presences.length > 0) {
            const presenceData = presences[0] as any;
            if (presenceData.state) {
              otherPlayerState = presenceData.state;
            }
          }
        }

        setRaceState(prev => {
          if (!otherPlayerState) return prev;
          return { ...prev, playerB: otherPlayerState };
        });
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
      .on('broadcast', { event: 'start_race' }, (payload) => {
        // The non-host receives this to transition to playing mode
        setRaceState(prev => ({
          ...prev,
          status: 'countdown',
          startTime: payload.startTime,
          seedStr: payload.seedStr
        }));
      })
      .on('broadcast', { event: 'chat' }, (payload) => {
        const id = Math.random().toString();
        setChatMessages(prev => [...prev, { id, text: payload.text, sender: payload.sender, time: Date.now() }]);
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
      supabase.removeChannel(channel);
    };
  }, [roomCode, userId, userName]);

  useEffect(() => {
    if (raceState.status === 'countdown' && raceState.startTime) {
      const interval = setInterval(() => {
        if (Date.now() >= raceState.startTime!) {
          setRaceState(prev => ({ ...prev, status: 'playing' }));
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [raceState.status, raceState.startTime]);

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
    channelRef.current?.send({
      type: 'broadcast',
      event: 'chat',
      payload: { text, sender: userId }
    });
    const id = Math.random().toString();
    setChatMessages(prev => [...prev, { id, text, sender: userId, time: Date.now() }]);
    setTimeout(() => {
      setChatMessages(prev => prev.filter(m => m.id !== id));
    }, 3000);
  };

  const startRaceAsLeader = () => {
    if (!isLeader) return;
    const seedStr = Math.random().toString(36).substring(2);
    const startTime = Date.now() + 3000;
    channelRef.current?.send({ type: 'broadcast', event: 'start_race', payload: { startTime, seedStr } });
    
    setRaceState(prev => ({
      ...prev,
      status: 'countdown',
      startTime: startTime,
      seedStr: seedStr
    }));
  };

  return { raceState, updateMyState, chatMessages, sendChat, startRaceAsLeader };
}
