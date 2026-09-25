import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/multiplayer/supabase';
import { useRouter } from 'next/navigation';
import type { Difficulty } from '@/lib/puzzle/generator';

/** 'race' = separate boards, first to finish wins. 'coop' = one shared board. */
export type RoomMode = 'race' | 'coop';

/** Sentinel winner id used when a co-op board is cleared together. */
export const TOGETHER = 'together';

export type RaceStatus = 'lobby' | 'countdown' | 'playing' | 'finished';

/**
 * The leader's view of the current round. The leader is the single source of
 * truth for it and publishes it inside its own player state, so a guest who
 * reloads, or whose countdown/game_over broadcast was dropped, can catch up by
 * reading the leader's presence instead of being stranded in the lobby.
 */
export interface RoomConfig {
  round: number;
  status: RaceStatus;
  difficulty: Difficulty;
  mode: RoomMode;
  startAt?: number;
  seedStr?: string;
  winner?: string;
}

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
  /**
   * Monotonic per-client revision. Presence can briefly hold an older meta
   * next to a newer one for the same key (Phoenix prepends the old metas on
   * update), and the reconcile loop used to read that stale entry and revert
   * the opponent — which is how "Ready" and difficulty changes got lost.
   * Anything with a lower rev than what we already hold is ignored.
   */
  rev: number;
  /** When this client joined the room; decides who gets the guest seat. */
  joinedAt: number;
  /** Local time the board was completed, for the leader's tie-break. */
  finishedAt?: number;
  /** Leader only: the guest holding the second seat. */
  seated?: string;
  /** Leader only: see RoomConfig. */
  room?: RoomConfig;
}

/** Lifecycle of the room itself, separate from the race inside it. */
export type RoomConnection = 'connecting' | 'connected' | 'not-found' | 'closed' | 'full';

export interface RaceState {
  me: PlayerState;
  opponent?: PlayerState;
  status: RaceStatus;
  startTime?: number;
  seedStr?: string;
  /** Winning player id, once decided. */
  winner?: string;
  round: number;
  /** The difficulty and mode this round is actually played at. */
  difficulty: Difficulty;
  mode: RoomMode;
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
const LEADER_GRACE_MS = 8000;
/** How long the leader keeps a vanished guest's seat (covers a reload). */
const SEAT_GRACE_MS = 20000;
const COUNTDOWN_MS = 3000;
const CHAT_TTL_MS = 3000;
/** How often presence is re-read in case an event was missed. */
const PRESENCE_RECONCILE_MS = 1000;
/** Leader waits this long after its own finish for an in-flight opponent finish. */
const FINISH_SETTLE_MS = 600;
/*
 * Outgoing rate limits. Realtime closes a channel that sends too fast: a burst
 * of finds (each one a broadcast AND a presence track) killed the guest's
 * channel mid-race, and the leader — who decides the winner — never saw them
 * finish. Updates are now coalesced: the latest state always goes out, just no
 * more often than this.
 */
const BROADCAST_MIN_MS = 250;
const TRACK_MIN_MS = 1500;
/** Backoff before rebuilding a channel the server closed or errored. */
const RECONNECT_MS = 1500;

const STATUS_ORDER: Record<RaceStatus, number> = { lobby: 0, countdown: 1, playing: 2, finished: 3 };

export function raceDurationSeconds(difficulty: Difficulty): number {
  return difficulty === 'easy' ? 180 : difficulty === 'medium' ? 150 : 120;
}

type PresenceMeta = { state?: PlayerState };

/** The freshest state among one key's metas. */
function newestState(entries: PresenceMeta[] | undefined): PlayerState | undefined {
  let best: PlayerState | undefined;
  for (const e of entries ?? []) {
    const s = e?.state;
    if (s && (!best || (s.rev ?? 0) >= (best.rev ?? 0))) best = s;
  }
  return best;
}

function roomKey(roomCode: string) {
  return `nhako_room_${roomCode}`;
}

function readSavedRoom(roomCode: string): RoomConfig | null {
  try {
    const raw = sessionStorage.getItem(roomKey(roomCode));
    if (!raw) return null;
    const room = JSON.parse(raw) as RoomConfig;
    // A round that ended long ago is not worth resuming.
    const end = (room.startAt ?? 0) + raceDurationSeconds(room.difficulty) * 1000 + 60_000;
    if (room.status !== 'lobby' && Date.now() > end) return null;
    return room;
  } catch {
    return null;
  }
}

export function useRaceRoom(roomCode: string, userId: string, userName: string) {
  const router = useRouter();
  const isLeader =
    typeof window !== 'undefined' &&
    sessionStorage.getItem('is_leader_' + roomCode) === 'true';

  const revRef = useRef(0);
  const nextRev = () => {
    revRef.current = Math.max(revRef.current + 1, Date.now());
    return revRef.current;
  };

  const [raceState, setRaceState] = useState<RaceState>(() => {
    // A leader who reloads mid-round resumes the round it was running.
    const saved = isLeader ? readSavedRoom(roomCode) : null;
    const difficulty = saved?.difficulty ?? 'medium';
    const mode = saved?.mode ?? 'race';
    const status = saved?.status ?? 'lobby';
    return {
      me: {
        id: userId,
        name: userName,
        difficulty,
        mode,
        // The leader has nothing to ready up for; they press Start instead.
        isReady: isLeader,
        isLeader,
        progress: 0,
        total: 0,
        foundWords: [],
        rev: 0,
        joinedAt: Date.now(),
        ...(isLeader ? { room: saved ?? { round: 1, status: 'lobby', difficulty, mode } } : {}),
      },
      status,
      startTime: saved?.startAt,
      seedStr: saved?.seedStr,
      winner: saved?.winner,
      round: saved?.round ?? 1,
      difficulty,
      mode,
    };
  });
  const [connection, setConnection] = useState<RoomConnection>('connecting');
  /** Bumped to rebuild the channel after the server closed or errored it. */
  const [channelGeneration, setChannelGeneration] = useState(0);
  const reconnectingRef = useRef(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Refs mirror state so the realtime effect never needs them as dependencies —
  // re-running it would tear down and rebuild the channel mid-race.
  const meRef = useRef<PlayerState>(raceState.me);
  const opponentRef = useRef<PlayerState | undefined>(undefined);
  const statusRef = useRef<RaceStatus>(raceState.status);
  const roundRef = useRef(raceState.round);
  const seedRef = useRef<string | undefined>(raceState.seedStr);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);
  const finishedRef = useRef(raceState.status === 'finished');
  const seenLeaderRef = useRef(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Leader: when the seated guest was last present. */
  const seatSeenAtRef = useRef(0);
  const rematchRef = useRef<() => void>(() => {});
  /** Guest: the leader's rev when it announced it was going away. */
  const leaderAwayRevRef = useRef<number | null>(null);

  const userNameRef = useRef(userName);
  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  const lastBroadcastRef = useRef(0);
  const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTrackRef = useRef(0);
  const trackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushBroadcast = useCallback(() => {
    broadcastTimerRef.current = null;
    const channel = channelRef.current;
    if (!subscribedRef.current || !channel) return;
    lastBroadcastRef.current = Date.now();
    const state = meRef.current;
    channel.send({ type: 'broadcast', event: 'state_update', payload: { id: state.id, state } });
  }, []);

  const flushTrack = useCallback(() => {
    trackTimerRef.current = null;
    const channel = channelRef.current;
    if (!subscribedRef.current || !channel) return;
    lastTrackRef.current = Date.now();
    channel.track({ state: meRef.current });
  }, []);

  /**
   * Publish my state: broadcast is the fast path, presence the durable copy a
   * late joiner (or a reconnect) reads. Both are coalesced, always sending the
   * newest state in meRef.
   */
  const publishMyState = useCallback(() => {
    if (!subscribedRef.current || !channelRef.current) return;
    const now = Date.now();
    if (!broadcastTimerRef.current) {
      const wait = BROADCAST_MIN_MS - (now - lastBroadcastRef.current);
      if (wait <= 0) flushBroadcast();
      else broadcastTimerRef.current = setTimeout(flushBroadcast, wait);
    }
    if (!trackTimerRef.current) {
      const wait = TRACK_MIN_MS - (now - lastTrackRef.current);
      if (wait <= 0) flushTrack();
      else trackTimerRef.current = setTimeout(flushTrack, wait);
    }
  }, [flushBroadcast, flushTrack]);

  const updateMyState = useCallback(
    (partial: Partial<PlayerState>) => {
      const prev = meRef.current;
      const next: PlayerState = { ...prev, ...partial, rev: nextRev() };
      if (next.total > 0 && next.progress >= next.total && !prev.finishedAt) {
        next.finishedAt = Date.now();
      }
      meRef.current = next;
      setRaceState(s => ({ ...s, me: next }));
      // Side effects live outside the updater — React may re-run, defer or
      // discard updater functions.
      publishMyState();
    },
    [publishMyState]
  );

  /** Leader only: change the round and publish it with my state. */
  const setRoom = useCallback(
    (room: RoomConfig, extra: Partial<PlayerState> = {}) => {
      try {
        sessionStorage.setItem(roomKey(roomCode), JSON.stringify(room));
      } catch {
        /* private mode */
      }
      updateMyState({ ...extra, room });
    },
    [roomCode, updateMyState]
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

    /*
     * Did THIS channel ever actually join? Scoped to the effect: React runs
     * effects twice in development, and a never-joined channel closing must
     * not announce `room_closed` to guests already waiting in the room.
     */
    let joined = false;
    /** Set by cleanup, so our own removeChannel does not trigger a rebuild. */
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    // The previous channel's cleanup has already read this flag (a rebuild is
    // not the leader leaving); reset it so a real teardown announces again.
    reconnectingRef.current = false;

    const clearLeaveTimer = () => {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }
    };

    /** Only the seated opponent's updates count; a third client is ignored. */
    const applyOpponent = (state: PlayerState | undefined) => {
      if (!state || state.id === userId) return;
      const prev = opponentRef.current;
      if (prev && prev.id === state.id && (state.rev ?? 0) <= (prev.rev ?? 0)) return;
      opponentRef.current = state;
      setRaceState(s => ({ ...s, opponent: state }));
    };

    const finish = (winnerId: string) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      statusRef.current = 'finished';
      setRaceState(s => ({ ...s, status: 'finished', winner: winnerId }));
    };

    /** Guest: move forward to wherever the leader's round is. */
    const adoptRoom = (room: RoomConfig | undefined) => {
      if (isLeader || !room) return;
      const ahead =
        room.round > roundRef.current ||
        (room.round === roundRef.current &&
          STATUS_ORDER[room.status] > STATUS_ORDER[statusRef.current]);
      const newSeed = room.seedStr && room.seedStr !== seedRef.current;
      if (!ahead && !newSeed) return;

      if (room.status === 'lobby') {
        finishedRef.current = false;
        statusRef.current = 'lobby';
        roundRef.current = room.round;
        seedRef.current = undefined;
        meRef.current = {
          ...meRef.current,
          isReady: false,
          progress: 0,
          total: 0,
          foundWords: [],
          finishedAt: undefined,
          rev: nextRev(),
        };
        setRaceState(s => ({
          ...s,
          me: meRef.current,
          status: 'lobby',
          winner: undefined,
          startTime: undefined,
          seedStr: undefined,
          round: room.round,
        }));
        return;
      }

      if (!room.seedStr || !room.startAt) return;
      const sameBoard = room.seedStr === seedRef.current;
      finishedRef.current = room.status === 'finished';
      statusRef.current = room.status;
      roundRef.current = room.round;
      seedRef.current = room.seedStr;
      if (!sameBoard) {
        meRef.current = {
          ...meRef.current,
          difficulty: room.difficulty,
          mode: room.mode,
          progress: 0,
          total: 0,
          foundWords: [],
          finishedAt: undefined,
          rev: nextRev(),
        };
      }
      setRaceState(s => ({
        ...s,
        me: meRef.current,
        status: room.status,
        startTime: room.startAt,
        seedStr: room.seedStr,
        winner: room.status === 'finished' ? room.winner : undefined,
        round: room.round,
        difficulty: room.difficulty,
        mode: room.mode,
      }));
    };

    /**
     * Reads the room from presence and settles who is playing whom.
     * The leader seats the earliest guest and keeps that seat through a
     * reload; everybody else is told the room is full.
     */
    const reconcile = () => {
      const presence = channel.presenceState() as Record<string, PresenceMeta[]>;
      const players: PlayerState[] = [];
      for (const [key, entries] of Object.entries(presence)) {
        const s = newestState(entries);
        if (s && key === s.id) players.push(s);
      }

      const leader = players
        .filter(p => p.isLeader)
        .sort((a, b) => a.joinedAt - b.joinedAt)[0];

      if (isLeader) {
        const me = meRef.current;
        const guests = players
          .filter(p => !p.isLeader && p.id !== userId)
          .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
        let seated = me.seated;
        const seatedPresent = seated ? guests.find(g => g.id === seated) : undefined;
        if (seatedPresent) seatSeenAtRef.current = Date.now();
        else if (seated && Date.now() - seatSeenAtRef.current > SEAT_GRACE_MS && statusRef.current === 'lobby') {
          seated = undefined;
        }
        if (!seated && guests[0]) {
          seated = guests[0].id;
          seatSeenAtRef.current = Date.now();
        }
        if (seated !== me.seated) {
          if (!seated) {
            opponentRef.current = undefined;
            setRaceState(s => ({ ...s, opponent: undefined }));
          }
          updateMyState({ seated });
        }
        applyOpponent(guests.find(g => g.id === seated));
        return;
      }

      // Guest.
      if (leader && leaderAwayRevRef.current !== null && (leader.rev ?? 0) <= leaderAwayRevRef.current) {
        // The server still lists a leader who announced it was leaving; only
        // a newer state (a reloaded leader re-tracks with a fresh rev) counts
        // as coming back. Keep the grace timer running meanwhile.
        return;
      }
      if (leader) {
        leaderAwayRevRef.current = null;
        seenLeaderRef.current = true;
        clearLeaveTimer();
        if (leader.seated && leader.seated !== userId) {
          setConnection('full');
          return;
        }
        setConnection('connected');
        applyOpponent(leader);
        adoptRoom(leader.room);
      } else if (seenLeaderRef.current && !leaveTimerRef.current) {
        // The leader dropped. Wait out a grace period (a reload) before giving up.
        leaveTimerRef.current = setTimeout(() => setConnection('closed'), LEADER_GRACE_MS);
      }
    };

    channel
      .on('presence', { event: 'sync' }, reconcile)
      .on('broadcast', { event: 'state_update' }, msg => {
        // Supabase delivers { type, event, payload }.
        const { id, state } = (msg.payload ?? {}) as { id?: string; state?: PlayerState };
        if (!id || id === userId || !state) return;
        if (isLeader) {
          if (id !== meRef.current.seated) return;
          applyOpponent(state);
        } else {
          if (!state.isLeader) return;
          if (leaderAwayRevRef.current !== null && (state.rev ?? 0) <= leaderAwayRevRef.current) return;
          leaderAwayRevRef.current = null;
          // Any word from the leader proves the room exists. Broadcast often
          // beats presence, and a leader who left before our next presence read
          // used to leave this guest on "No room" instead of "room closed".
          seenLeaderRef.current = true;
          clearLeaveTimer();
          if (state.seated && state.seated !== userId) {
            setConnection('full');
            return;
          }
          setConnection('connected');
          applyOpponent(state);
          adoptRoom(state.room);
        }
      })
      .on('broadcast', { event: 'game_over' }, msg => {
        const { winner } = (msg.payload ?? {}) as { winner?: string };
        if (winner && !isLeader) finish(winner);
      })
      .on('broadcast', { event: 'rematch_request' }, msg => {
        // A guest's rematch request moves the leader back to the lobby too.
        const { id } = (msg.payload ?? {}) as { id?: string };
        if (isLeader && id === meRef.current.seated && statusRef.current === 'finished') {
          rematchRef.current();
        }
      })
      .on('broadcast', { event: 'chat_message' }, msg => {
        const { content, playerId } = (msg.payload ?? {}) as {
          content?: string;
          playerId?: string;
        };
        if (!content || !playerId || playerId === userId) return;
        if (opponentRef.current && playerId !== opponentRef.current.id) return;
        pushChat(content.slice(0, 80), playerId);
      })
      .on('broadcast', { event: 'room_closed' }, () => {
        if (!isLeader) setConnection('closed');
      })
      .on('broadcast', { event: 'leader_away' }, () => {
        // Start the grace period now; the leader's return cancels it.
        if (isLeader) return;
        leaderAwayRevRef.current = opponentRef.current?.rev ?? 0;
        if (!leaveTimerRef.current) {
          leaveTimerRef.current = setTimeout(() => setConnection('closed'), LEADER_GRACE_MS);
        }
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          joined = true;
          subscribedRef.current = true;
          meRef.current = { ...meRef.current, name: userNameRef.current, rev: nextRev() };
          lastTrackRef.current = Date.now();
          await channel.track({ state: meRef.current });
          // After a rebuild, catch the other side up straight away.
          flushBroadcast();
          if (isLeader) {
            seenLeaderRef.current = true;
            setConnection('connected');
          }
          return;
        }
        // The server closed or errored the channel (rate limit, network
        // drop). Nothing re-joins a closed channel on its own, so rebuild it.
        if (disposed) return;
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          subscribedRef.current = false;
          if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
              reconnectingRef.current = true;
              setChannelGeneration(g => g + 1);
            }, RECONNECT_MS);
          }
        }
      });

    // A guest that never sees a leader is in a room that does not exist.
    const discovery = isLeader
      ? null
      : setTimeout(() => {
          if (!seenLeaderRef.current) setConnection('not-found');
        }, LEADER_DISCOVERY_MS);

    /*
     * Presence reconciliation, for the whole life of the room (not just the
     * lobby: a dropped frame mid-race used to freeze the opponent's bar). It
     * is rev-guarded, so it only ever moves state forward.
     */
    const tick = setInterval(reconcile, PRESENCE_RECONCILE_MS);

    /*
     * Closing the tab (or the installed app) does not run React cleanup, and
     * the realtime server only notices a vanished socket after a heartbeat
     * timeout — the guest sat in a dead room for up to a minute.
     *
     * The page lifecycle cannot tell a close from a reload, so it sends
     * `leader_away`, which starts the guest's grace period right now instead
     * of after the server's timeout. A reloading leader is back well inside the
     * grace period and the guest never notices; a closed tab ends the room a
     * few seconds later. Leaving from inside the app still sends
     * `room_closed` (effect cleanup below), which is immediate.
     */
    let awaySent = false;
    const sayAway = () => {
      if (awaySent || !isLeader || !joined) return;
      awaySent = true;
      channel.send({ type: 'broadcast', event: 'leader_away', payload: {} });
    };
    const onPageHide = (e: PageTransitionEvent) => {
      // A page kept in the back/forward cache may come back as-is.
      if (!e.persisted) sayAway();
    };
    // Desktop close paths fire beforeunload reliably; mobile ones pagehide.
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', sayAway);

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current);
      if (trackTimerRef.current) clearTimeout(trackTimerRef.current);
      broadcastTimerRef.current = null;
      trackTimerRef.current = null;
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', sayAway);
      subscribedRef.current = false;
      clearLeaveTimer();
      clearInterval(tick);
      if (discovery) clearTimeout(discovery);
      chatTimersRef.current.forEach(clearTimeout);
      chatTimersRef.current = [];
      // Only a channel that actually joined may announce the room closed: a
      // never-joined channel closing is React remounting, not the leader leaving.
      if (isLeader && joined && !reconnectingRef.current) {
        channel.send({ type: 'broadcast', event: 'room_closed', payload: {} });
      }
      supabase.removeChannel(channel);
      if (channelRef.current === channel) channelRef.current = null;
    };
    // `isLeader`, `pushChat` and `updateMyState` are stable for the life of the
    // room; listing them risks tearing down a live channel mid-race.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, userId, channelGeneration]);

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
        if (statusRef.current !== 'countdown') return;
        statusRef.current = 'playing';
        setRaceState(prev =>
          prev.status === 'countdown' ? { ...prev, status: 'playing' } : prev
        );
        if (isLeader) {
          const room = meRef.current.room;
          if (room) setRoom({ ...room, status: 'playing' });
        }
      },
      Math.max(0, delay)
    );
    return () => clearTimeout(t);
  }, [raceState.status, raceState.startTime, isLeader, setRoom]);

  // ------------------------------------------------------------ race clock
  useEffect(() => {
    if (raceState.status !== 'playing' || !raceState.startTime) return;

    const endTime = raceState.startTime + raceDurationSeconds(raceState.difficulty) * 1000;
    let settleSince = 0;

    const declare = (winnerId: string) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      statusRef.current = 'finished';
      setRaceState(prev => ({ ...prev, status: 'finished', winner: winnerId }));
      if (isLeader) {
        const room = meRef.current.room;
        if (room) setRoom({ ...room, status: 'finished', winner: winnerId });
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
      const done = (p?: PlayerState) => !!p && p.total > 0 && p.progress >= p.total;

      // Co-op: one shared board, so finds from both players count once.
      // Either side may call it; the result is the same.
      if (me.mode === 'coop') {
        const together = new Set([...me.foundWords, ...(opp?.foundWords ?? [])]);
        if (me.total > 0 && together.size >= me.total) declare(TOGETHER);
        else if (Date.now() >= endTime && isLeader) declare(TOGETHER);
        return;
      }

      // Race: only the leader decides, so the two clients can never each
      // conclude that they won.
      if (!isLeader) return;
      const meDone = done(me);
      const oppDone = done(opp);
      if (meDone && oppDone) {
        declare((opp!.finishedAt ?? Infinity) < (me.finishedAt ?? Infinity) ? opp!.id : me.id);
      } else if (oppDone) {
        declare(opp!.id);
      } else if (meDone) {
        // Give an opponent finish that is already in flight a moment to land.
        if (!settleSince) settleSince = Date.now();
        else if (Date.now() - settleSince >= FINISH_SETTLE_MS) declare(me.id);
      } else if (Date.now() >= endTime) {
        const myScore = me.progress / (me.total || 1);
        const oppScore = opp ? opp.progress / (opp.total || 1) : -1;
        declare(opp && oppScore > myScore ? opp.id : me.id);
      }
    }, 200);

    return () => clearInterval(tick);
  }, [raceState.status, raceState.startTime, raceState.difficulty, isLeader, setRoom]);

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
    const { difficulty, mode } = meRef.current;
    const round = roundRef.current;

    finishedRef.current = false;
    statusRef.current = 'countdown';
    seedRef.current = seedStr;

    setRaceState(prev => ({
      ...prev,
      status: 'countdown',
      startTime: startAt,
      seedStr,
      winner: undefined,
      difficulty,
      mode,
    }));
    setRoom(
      { round, status: 'countdown', startAt, seedStr, difficulty, mode },
      { progress: 0, total: 0, foundWords: [], finishedAt: undefined }
    );
  }, [isLeader, roomCode, setRoom]);

  const requestRematch = useCallback(() => {
    if (!subscribedRef.current) return;
    if (!isLeader) {
      // Guests ask; the leader owns the round.
      updateMyState({ isReady: false });
      channelRef.current?.send({ type: 'broadcast', event: 'rematch_request', payload: { id: userId } });
    }
    const round = roundRef.current + 1;
    finishedRef.current = false;
    statusRef.current = 'lobby';
    roundRef.current = round;
    seedRef.current = undefined;
    setRaceState(prev => ({
      ...prev,
      status: 'lobby',
      winner: undefined,
      startTime: undefined,
      seedStr: undefined,
      round,
    }));
    const reset = { progress: 0, total: 0, foundWords: [], finishedAt: undefined };
    if (isLeader) {
      const { difficulty, mode } = meRef.current;
      setRoom({ round, status: 'lobby', difficulty, mode }, reset);
    } else {
      updateMyState({ ...reset, isReady: false });
    }
  }, [isLeader, setRoom, updateMyState, userId]);

  // The channel effect reaches the latest requestRematch through this ref.
  useEffect(() => {
    rematchRef.current = requestRematch;
  }, [requestRematch]);

  /** Difficulty and mode: the round's once it starts, the leader's in the lobby. */
  const leaderState = raceState.me.isLeader ? raceState.me : raceState.opponent;
  const inRound = raceState.status !== 'lobby';
  const roomDifficulty: Difficulty = inRound
    ? raceState.difficulty
    : leaderState?.difficulty ?? raceState.me.difficulty;
  const roomMode: RoomMode = inRound ? raceState.mode : leaderState?.mode ?? raceState.me.mode;

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
