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
  const [raceState, setRaceState] = useState<RaceState>({ status: 'lobby' });
  const [chatMessages, setChatMessages] = useState<{ id: string, text: string, sender: string, time: number }[]>([]);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const channel = supabase.channel(`room:${roomCode}`, {
      config: { presence: { key: userId } }
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'state_update' }, (payload) => {
        setRaceState(prev => {
          let isA = false;
          if (prev.playerA?.id === payload.id) isA = true;
          else if (prev.playerB?.id === payload.id) isA = false;
          else if (!prev.playerA || prev.playerA.id === userId) isA = false; // we are A, they are B
          else isA = true; // they are A, we are B
          
          const key = isA ? 'playerA' : 'playerB';
          return { ...prev, [key]: payload.state };
        });
      })
      .on('broadcast', { event: 'start_race' }, (payload) => {
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Announce ourselves
          channel.send({
            type: 'broadcast',
            event: 'state_update',
            payload: { id: userId, state: { id: userId, name: userName, difficulty: 'medium', ready: false, progress: 0, total: 8 } }
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, userId, userName]);

  const updateMyState = (partialState: Partial<PlayerState>) => {
    setRaceState(prev => {
      const isA = prev.playerA?.id === userId || !prev.playerA; // First to update is A
      const key = isA ? 'playerA' : 'playerB';
      const myState = { 
        id: userId, 
        name: userName, 
        difficulty: 'medium', 
        ready: false, 
        progress: 0, 
        total: 8,
        ...(prev[key] || {}), 
        ...partialState 
      };
      
      channelRef.current?.send({
        type: 'broadcast',
        event: 'state_update',
        payload: { id: userId, state: myState }
      });
      
      const newState = { ...prev, [key]: myState };
      if (newState.status === 'lobby' && newState.playerA?.ready && newState.playerB?.ready) {
         if (isA) {
           const seedStr = Math.random().toString(36).substring(2);
           const startTime = Date.now() + 3000;
           channelRef.current?.send({
             type: 'broadcast',
             event: 'start_race',
             payload: { startTime, seedStr }
           });
           newState.status = 'playing';
           newState.startTime = startTime;
           newState.seedStr = seedStr;
         }
      }
      return newState;
    });
  };

  const sendChat = (text: string) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'chat',
      payload: { text, sender: userId }
    });
    // Add to own state since broadcast self doesn't always trigger if not configured
    setChatMessages(prev => [...prev, { id: Math.random().toString(), text, sender: userId, time: Date.now() }]);
  };

  return { raceState, updateMyState, chatMessages, sendChat };
}
