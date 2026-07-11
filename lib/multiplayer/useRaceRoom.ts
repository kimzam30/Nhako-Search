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
    const channel = supabase.channel(`room:${roomCode}`, {
      config: { presence: { key: userId } }
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        // Broadcast our state whenever anyone's presence changes (i.e. someone joins)
        channel.send({
          type: 'broadcast',
          event: 'state_update',
          payload: { id: userId, state: myStateRef.current }
        });
      })
      .on('broadcast', { event: 'state_update' }, (payload) => {
        setRaceState(prev => {
          if (payload.id === userId) return prev; // Ignore our own echoes
          
          let isA = false;
          if (prev.playerA?.id === payload.id) isA = true;
          else if (prev.playerB?.id === payload.id) isA = false;
          else if (prev.playerA?.id === userId) isA = false; // We are A, so they must be B
          else isA = true;
          
          const key = isA ? 'playerA' : 'playerB';
          const newState = { ...prev, [key]: payload.state };
          
          if (newState.status === 'lobby' && newState.playerA?.ready && newState.playerB?.ready) {
             // Only player A dictates the start event to prevent duplicates
             if (newState.playerA.id === userId) {
                const seedStr = Math.random().toString(36).substring(2);
                const startTime = Date.now() + 3000;
                channel.send({
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
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
          channel.send({
            type: 'broadcast',
            event: 'state_update',
            payload: { id: userId, state: myStateRef.current }
          });
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
      
      channelRef.current?.send({
        type: 'broadcast',
        event: 'state_update',
        payload: { id: userId, state: newMyState }
      });
      
      const newState = { ...prev, [key]: newMyState };
      
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
    setChatMessages(prev => [...prev, { id: Math.random().toString(), text, sender: userId, time: Date.now() }]);
  };

  return { raceState, updateMyState, chatMessages, sendChat };
}
