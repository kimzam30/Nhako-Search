import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/multiplayer/supabase';

export interface PlayerState {
  id: string;
  name: string;
  difficulty: string;
  ready: boolean;
  progress: number;
  total: number;
}

export interface RaceState {
  playerA?: PlayerState;
  playerB?: PlayerState;
  status: 'lobby' | 'playing' | 'finished';
  startTime?: number;
  seedStr?: string;
  winner?: string;
}

export function useRaceRoom(roomCode: string, userId: string, userName: string) {
  const [raceState, setRaceState] = useState<RaceState>({ 
    status: 'lobby',
    playerA: { id: userId, name: userName, difficulty: 'medium', ready: false, progress: 0, total: 8 }
  });
  
  const myStateRef = useRef<PlayerState>({ 
    id: userId, name: userName, difficulty: 'medium', ready: false, progress: 0, total: 8 
  });
  
  const [chatMessages, setChatMessages] = useState<{ id: string, text: string, sender: string, time: number }[]>([]);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (raceState.status === 'lobby' && raceState.playerA?.ready && raceState.playerB?.ready) {
      // Host Election: deterministic check to ensure exactly one player broadcasts the start payload
      const isHost = userId === [raceState.playerA.id, raceState.playerB.id].sort()[0];
      if (isHost) {
        const seedStr = Math.random().toString(36).substring(2);
        const startTime = Date.now() + 3000;
        channelRef.current?.send({ type: 'broadcast', event: 'start_race', payload: { startTime, seedStr } });
        
        setRaceState(prev => ({
          ...prev,
          status: 'playing',
          startTime: startTime,
          seedStr: seedStr
        }));
      }
    }
  }, [raceState.status, raceState.playerA?.ready, raceState.playerB?.ready, raceState.playerA?.id, raceState.playerB?.id, userId]);

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
          status: 'playing',
          startTime: payload.startTime,
          seedStr: payload.seedStr
        }));
      })
      .on('broadcast', { event: 'chat' }, (payload) => {
        setChatMessages(prev => [...prev, { id: Math.random().toString(), text: payload.text, sender: payload.sender, time: Date.now() }]);
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
    setChatMessages(prev => [...prev, { id: Math.random().toString(), text, sender: userId, time: Date.now() }]);
  };

  return { raceState, updateMyState, chatMessages, sendChat };
}
