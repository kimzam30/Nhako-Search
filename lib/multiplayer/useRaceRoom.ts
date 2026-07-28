import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/multiplayer/supabase';
import { useRouter } from 'next/navigation';
import type { Difficulty } from '@/lib/puzzle/generator';

/** 'race' = separate boards, first to finish wins. 'coop' = one shared board. */
export type RoomMode = 'race' | 'coop';

/** Sentinel winner id used when a co-op board is cleared together. */
export const TOGETHER = 'together';

export interface PlayerState {
  id: string;
  name: string;
  difficulty: Difficulty;
  mode: RoomMode;
  isReady: boolean;
  isLeader: boolean;
  progress: number;
  total: number;
  foundWords: string[];
}

export type RaceStatus = 'lobby' | 'countdown' | 'playing' | 'finished';

/** Lifecycle of the room itself, separate from the race inside it. */
export type RoomConnection = 'connecting' | 'connected' | 'not-found' | 'closed';

export interface RaceState {
  /**
   * `me` / `opponent` are keyed on user id. The old playerA/playerB pair was
   * client-relative — both clients initialised playerA to themselves, so
   * "playerA" meant "me" on both machines. That made every incoming update a
   * guess, and made both clients write the match-history row.
   */
  me: PlayerState;
  opponent?: PlayerState;
  status: RaceStatus;
  startTime?: number;
  seedStr?: string;
  /** Winning player id, once decided. */
  winner?: string;
  round: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  time: number;
}

/** How long a guest waits for the leader before deciding the room isn't real. */
const LEADER_DISCOVERY_MS = 6000;
/** Grace period before treating a vanished leader as "room closed". */
const LEADER_GRACE_MS = 5000;
const COUNTDOWN_MS = 3000;
const CHAT_TTL_MS = 3000;

export function raceDurationSeconds(difficulty: Difficulty): number {
  return difficulty === 'easy' ? 180 : difficulty === 'medium' ? 150 : 120;
}

export function useRaceRoom(roomCode: string, userId: string, userName: string) {
  const router = useRouter();
  const isLeader =
    typeof window !== 'undefined' &&
    sessionStorage.getItem('is_leader_' + roomCode) === 'true';

  const [raceState, setRaceState] = useState<RaceState>(() => ({
    me: {
      id: userId,
      name: userName,
      difficulty: 'medium',
      mode: 'race',
      // The leader has nothing to ready up for; they press Start instead.
      isReady: isLeader,
      isLeader,
      progress: 0,
      total: 0,
      foundWords: [],
    },
    status: 'lobby',
    round: 1,
  }));
  const [connection, setConnection] = useState<RoomConnection>('connecting');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Refs mirror state so the realtime effect never needs them as dependencies —
  // re-running it would tear down and rebuild the channel mid-race.
  const meRef = useRef<PlayerState>(raceState.me);
  const opponentRef = useRef<PlayerState | undefined>(undefined);
  const statusRef = useRef<RaceStatus>('lobby');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);
  const finishedRef = useRef(false);
  const seenLeaderRef = useRef(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const userNameRef = useRef(userName);
  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  /** Publish my state. Sends happen here, never inside a setState updater. */
  const publishMyState = useCallback((next: PlayerState, alsoTrack: boolean) => {
    if (!subscribedRef.current || !channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'state_update',
      payload: { id: next.id, state: next },
    });
    if (alsoTrack) {
      // Presence is the durable fallback: a late joiner reads it on sync.
      channelRef.current.track({ online_at: new Date().toISOString(), state: next });
    }
  }, []);

  const updateMyState = useCallback(
    (partial: Partial<PlayerState>) => {
      const next = { ...meRef.current, ...partial };
      meRef.current = next;
      setRaceState(prev => ({ ...prev, me: next }));
      // Side effects live outside the updater — React may re-run, defer or
      // discard updater functions, which made the presence fallback unreliable.
      publishMyState(next, statusRef.current === 'lobby');
    },
    [publishMyState]
  );

  const pushChat = useCallback((text: string, sender: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setChatMessages(prev => [...prev, { id, text, sender, time: Date.now() }]);
    const t = setTimeout(() => {
      setChatMessages(prev => prev.filter(m => m.id !== id));
    }, CHAT_TTL_MS);
    chatTimersRef.current.push(t);
  }, []);

  // ---------------------------------------------------------------- channel
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`room:${roomCode}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;
    finishedRef.current = false;

    const clearLeaveTimer = () => {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }
    };

    const applyOpponent = (state: PlayerState | undefined) => {
      if (!state || state.id === userId) return;
      opponentRef.current = state;
      setRaceState(prev => ({ ...prev, opponent: state }));
    };

    const finish = (winnerId: string) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      statusRef.current = 'finished';
      setRaceState(prev => ({ ...prev, status: 'finished', winner: winnerId }));
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const presence = channel.presenceState() as Record<
          string,
          Array<{ state?: PlayerState }>
        >;

        let leaderPresent = false;
        let other: PlayerState | undefined;

        for (const [key, entries] of Object.entries(presence)) {
          const state = entries?.[0]?.state;
          if (!state) continue;
          if (key !== userId) other = state;
          if (state.isLeader) leaderPresent = true;
        }

        applyOpponent(other);

        if (leaderPresent) {
          seenLeaderRef.current = true;
          clearLeaveTimer();
          setConnection('connected');
        } else if (seenLeaderRef.current && !isLeader && !leaveTimerRef.current) {
          // The leader dropped. Wait out a grace period before giving up —
          // kicking on the first sync bounced guests who simply arrived early.
          leaveTimerRef.current = setTimeout(() => {
            setConnection('closed');
          }, LEADER_GRACE_MS);
        }
      })
      .on('broadcast', { event: 'state_update' }, msg => {
        // Supabase delivers { type, event, payload } — the data is nested one
        // level deeper than the old code read it, so every field was undefined.
        const { id, state } = (msg.payload ?? {}) as { id?: string; state?: PlayerState };
        if (!id || id === userId || !state) return;
        applyOpponent(state);
      })
      .on('broadcast', { event: 'countdown_start' }, msg => {
        const { startAt, seedStr, difficulty, mode, round } = (msg.payload ?? {}) as {
          startAt?: number;
          seedStr?: string;
          difficulty?: Difficulty;
          mode?: RoomMode;
          round?: number;
        };
        if (!startAt || !seedStr) return;
        finishedRef.current = false;
        statusRef.current = 'countdown';
        // Adopt the leader's difficulty AND mode so both clients build the
        // same grid and agree on how it is scored.
        meRef.current = {
          ...meRef.current,
          ...(difficulty ? { difficulty } : {}),
          ...(mode ? { mode } : {}),
          progress: 0,
          foundWords: [],
        };
        setRaceState(prev => ({
          ...prev,
          me: meRef.current,
          status: 'countdown',
          startTime: startAt,
          seedStr,
          winner: undefined,
          round: round ?? prev.round,
        }));
      })
      .on('broadcast', { event: 'game_start' }, () => {
        statusRef.current = 'playing';
        setRaceState(prev =>
          prev.status === 'playing' ? prev : { ...prev, status: 'playing' }
        );
      })
      .on('broadcast', { event: 'game_over' }, msg => {
        const { winner } = (msg.payload ?? {}) as { winner?: string };
        if (winner) finish(winner);
      })
      .on('broadcast', { event: 'rematch' }, () => {
        finishedRef.current = false;
        statusRef.current = 'lobby';
        meRef.current = {
          ...meRef.current,
          isReady: meRef.current.isLeader,
          progress: 0,
          total: 0,
          foundWords: [],
        };
        setRaceState(prev => ({
          ...prev,
          me: meRef.current,
          status: 'lobby',
          winner: undefined,
          startTime: undefined,
          seedStr: undefined,
          round: prev.round + 1,
        }));
      })
      .on('broadcast', { event: 'chat_message' }, msg => {
        const { content, playerId } = (msg.payload ?? {}) as {
          content?: string;
          playerId?: string;
        };
        if (!content || !playerId || playerId === userId) return;
        pushChat(content, playerId);
      })
      .on('broadcast', { event: 'room_closed' }, () => {
        if (!isLeader) setConnection('closed');
      })
      .subscribe(async status => {
        if (status !== 'SUBSCRIBED') return;
        subscribedRef.current = true;
        meRef.current = { ...meRef.current, name: userNameRef.current };
        await channel.track({
          online_at: new Date().toISOString(),
          state: meRef.current,
        });
        if (isLeader) {
          seenLeaderRef.current = true;
          setConnection('connected');
        }
      });

    // A guest that never sees a leader is in a room that does not exist.
    const discovery = isLeader
      ? null
      : setTimeout(() => {
          if (!seenLeaderRef.current) setConnection('not-found');
        }, LEADER_DISCOVERY_MS);

    return () => {
      subscribedRef.current = false;
      clearLeaveTimer();
      if (discovery) clearTimeout(discovery);
      chatTimersRef.current.forEach(clearTimeout);
      chatTimersRef.current = [];
      if (isLeader) {
        channel.send({ type: 'broadcast', event: 'room_closed', payload: {} });
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomCode, userId, isLeader, pushChat]);

  // Leaving is a navigation side effect, kept out of the channel setup.
  useEffect(() => {
    if (connection === 'closed') router.push('/play/race/lobby');
  }, [connection, router]);

  // ------------------------------------------------------- countdown → play
  useEffect(() => {
    if (raceState.status !== 'countdown' || !raceState.startTime) return;
    const delay = raceState.startTime - Date.now();
    const t = setTimeout(
      () => {
        statusRef.current = 'playing';
        setRaceState(prev =>
          prev.status === 'countdown' ? { ...prev, status: 'playing' } : prev
        );
        // The leader announces the transition so a slow client catches up.
        if (isLeader && subscribedRef.current) {
          channelRef.current?.send({ type: 'broadcast', event: 'game_start', payload: {} });
        }
      },
      Math.max(0, delay)
    );
    return () => clearTimeout(t);
  }, [raceState.status, raceState.startTime, isLeader]);

  // ------------------------------------------------------------ race clock
  useEffect(() => {
    if (raceState.status !== 'playing' || !raceState.startTime) return;

    const endTime =
      raceState.startTime + raceDurationSeconds(raceState.me.difficulty) * 1000;

    const declare = (winnerId: string) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      statusRef.current = 'finished';
      setRaceState(prev => ({ ...prev, status: 'finished', winner: winnerId }));
      if (subscribedRef.current) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'game_over',
          payload: { winner: winnerId },
        });
      }
    };

    const tick = setInterval(() => {
      if (finishedRef.current) return;
      const me = meRef.current;
      const opp = opponentRef.current;

      // Co-op: one shared board, so finds from both players count once.
      if (me.mode === 'coop') {
        const together = new Set([...me.foundWords, ...(opp?.foundWords ?? [])]);
        if (me.total > 0 && together.size >= me.total) {
          declare(TOGETHER);
        } else if (Date.now() >= endTime && isLeader) {
          declare(TOGETHER);
        }
        return;
      }

      if (me.total > 0 && me.progress >= me.total) {
        declare(me.id);
      } else if (opp && opp.total > 0 && opp.progress >= opp.total) {
        declare(opp.id);
      } else if (Date.now() >= endTime && isLeader) {
        // Only the leader resolves a timeout, so the two clients cannot each
        // decide they won.
        const myScore = me.progress / (me.total || 1);
        const oppScore = opp ? opp.progress / (opp.total || 1) : -1;
        declare(opp && oppScore > myScore ? opp.id : me.id);
      }
    }, 250);

    return () => clearInterval(tick);
  }, [raceState.status, raceState.startTime, raceState.me.difficulty, isLeader]);

  // ---------------------------------------------------------------- actions
  const sendChat = useCallback(
    (text: string) => {
      const safeText = text.slice(0, 80);
      if (!safeText.trim() || !subscribedRef.current) return;
      channelRef.current?.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: { content: safeText, playerId: userId },
      });
      pushChat(safeText, userId);
    },
    [userId, pushChat]
  );

  const startRaceAsLeader = useCallback(() => {
    if (!isLeader || !subscribedRef.current) return;
    const seedStr = `${roomCode}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const startAt = Date.now() + COUNTDOWN_MS;
    const difficulty = meRef.current.difficulty;
    const mode = meRef.current.mode;

    finishedRef.current = false;
    statusRef.current = 'countdown';

    channelRef.current?.send({
      type: 'broadcast',
      event: 'countdown_start',
      payload: { startAt, seedStr, difficulty, mode, round: raceState.round },
    });

    setRaceState(prev => ({
      ...prev,
      status: 'countdown',
      startTime: startAt,
      seedStr,
      winner: undefined,
    }));
  }, [isLeader, roomCode, raceState.round]);

  const requestRematch = useCallback(() => {
    if (!subscribedRef.current) return;
    channelRef.current?.send({ type: 'broadcast', event: 'rematch', payload: {} });
    finishedRef.current = false;
    statusRef.current = 'lobby';
    const next = {
      ...meRef.current,
      isReady: meRef.current.isLeader,
      progress: 0,
      total: 0,
      foundWords: [],
    };
    meRef.current = next;
    setRaceState(prev => ({
      ...prev,
      me: next,
      status: 'lobby',
      winner: undefined,
      startTime: undefined,
      seedStr: undefined,
      round: prev.round + 1,
    }));
    publishMyState(next, true);
  }, [publishMyState]);

  /** Difficulty and mode are always the leader's; guests only mirror them. */
  const leaderState = raceState.me.isLeader
    ? raceState.me
    : raceState.opponent?.isLeader
      ? raceState.opponent
      : raceState.me;
  const roomDifficulty: Difficulty = leaderState.difficulty;
  const roomMode: RoomMode = leaderState.mode;

  return {
    raceState,
    connection,
    roomDifficulty,
    roomMode,
    updateMyState,
    chatMessages,
    sendChat,
    startRaceAsLeader,
    requestRematch,
    isLeader,
  };
}
