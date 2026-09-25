'use client';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRaceRoom, raceDurationSeconds, TOGETHER, type RoomMode } from '@/lib/multiplayer/useRaceRoom';
import { GameClient } from '@/components/game/GameClient';
import { motion } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import { ButterflyGarland } from '@/components/game/ButterflyGarland';
import { supabase } from '@/lib/multiplayer/supabase';
import { ButterflySvg, ShareSvg } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChatWidget } from '@/components/multiplayer/ChatWidget';
import { PartnerGridDisplay } from '@/components/game/PartnerGridDisplay';
import { getUserProfile } from '@/lib/auth/profile';
import { getStableGuestId } from '@/lib/multiplayer/identity';
import standardPool from '@/lib/words/standard.json';
import type { Difficulty } from '@/lib/puzzle/generator';

function ProgressBar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-baseline mb-1 gap-2">
        <span className="text-xs font-bold text-ink uppercase tracking-wider truncate">
          {label}
        </span>
        <span className="text-xs font-bold text-ink-2 tabular-nums shrink-0">
          {total > 0 ? `${value}/${total}` : '—'}
        </span>
      </div>
      <div
        className="w-full h-3 bg-background border-2 border-ink rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={Math.max(total, 1)}
        aria-label={label}
      >
        <div className={`h-full ${tone} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Invite through the system share sheet (native on phones), falling back to
 * copying the link where Web Share is unavailable (most desktops).
 */
function InviteButton({ roomCode }: { roomCode: string }) {
  const [copied, setCopied] = useState(false);
  const invite = async () => {
    const url = `${window.location.origin}/play/race/${roomCode}`;
    const text = `Come find words with me! Room ${roomCode}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'NhakoSearch', text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the user dismissed the share sheet */
    }
  };
  return (
    <button
      type="button"
      onClick={invite}
      className="press shrink-0 flex items-center gap-2 min-h-[44px] px-4 rounded-full border-2 border-ink bg-surface font-body font-extrabold text-ink"
    >
      <ShareSvg className="w-5 h-5" />
      <span aria-live="polite">{copied ? 'Copied' : 'Invite'}</span>
    </button>
  );
}

export default function RaceRoomPage() {
  const params = useParams();
  const roomCode = (params.roomCode as string)?.toUpperCase();
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const profile = await getUserProfile();
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      // A guest keeps the same id across a reload so they rejoin the room
      // instead of arriving as a brand-new player.
      setUserId(data?.user?.id ?? getStableGuestId());
      setUserName(profile.displayName);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!userId) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-ink font-display text-2xl">
        Loading...
      </div>
    );
  }
  return <RaceRoom activeUserId={userId} activeUserName={userName} roomCode={roomCode} />;
}

function RaceRoom({
  activeUserId,
  activeUserName,
  roomCode,
}: {
  activeUserId: string;
  activeUserName: string;
  roomCode: string;
}) {
  const router = useRouter();
  const {
    raceState,
    connection,
    roomDifficulty,
    roomMode,
    updateMyState,
    chatMessages,
    sendChat,
    startRaceAsLeader,
    requestRematch,
  } = useRaceRoom(roomCode, activeUserId, activeUserName);

  const { me, opponent } = raceState;
  const isFinished = raceState.status === 'finished';
  const isCoop = roomMode === 'coop';
  const clearedTogether = isFinished && raceState.winner === TOGETHER;
  const iWon = isFinished && raceState.winner === activeUserId;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // Only tick while a clock is actually on screen.
    if (raceState.status !== 'playing' && raceState.status !== 'countdown') return;
    const int = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(int);
  }, [raceState.status]);

  // The whole pool is passed in; the generator picks a deterministic subset
  // from the shared seed, so both players build an identical grid.
  const racePool =
    (standardPool as Record<string, string[]>)[roomDifficulty] ?? standardPool.easy;

  // Finds are kept per board for the tab's life, so a reload mid-race puts
  // the player straight back where they were instead of on a blank board.
  const foundKey = raceState.seedStr ? `nhako_race_found_${raceState.seedStr}` : null;
  const initialFoundWords = useMemo<string[] | undefined>(() => {
    if (!foundKey) return undefined;
    try {
      const saved = JSON.parse(sessionStorage.getItem(foundKey) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }, [foundKey]);

  const handleProgress = useCallback(
    (progress: number, foundWords: string[], total: number) => {
      updateMyState({ progress, total, foundWords });
      if (foundKey) {
        try {
          sessionStorage.setItem(foundKey, JSON.stringify(foundWords));
        } catch {
          /* private mode */
        }
      }
    },
    [updateMyState, foundKey]
  );

  /*
   * Which match, if any, has already been written.
   *
   * Only the leader writes history — but "leader-only" alone is not enough to
   * get exactly one row. `opponent` is a fresh object every time an incoming
   * state_update is applied, so it changes identity in this dependency array;
   * a last progress frame arriving just after the leader flips to `finished`
   * (the normal ordering when the leader wins) re-ran this effect and wrote a
   * second row for the same match, inflating Wins.
   *
   * Keying on the round means a genuine rematch still records.
   */
  const savedRoundRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isFinished || !opponent || !me.isLeader || !raceState.winner) return;
    if (raceState.winner === TOGETHER) return; // co-op is not a win/loss record
    if (savedRoundRef.current === raceState.round) return;
    savedRoundRef.current = raceState.round;
    import('@/lib/multiplayer/history').then(({ saveRaceHistory }) => {
      saveRaceHistory(me.id, opponent.id, raceState.winner!, roomDifficulty, roomDifficulty);
    });
  }, [
    isFinished,
    opponent,
    me.isLeader,
    me.id,
    raceState.winner,
    raceState.round,
    roomDifficulty,
  ]);

  // Both players record their own "together" butterfly.
  useEffect(() => {
    if (!clearedTogether) return;
    Promise.all([
      import('@/lib/multiplayer/history'),
      import('@/lib/daily/logic'),
    ]).then(([{ awardTogetherButterfly }, { gameDateString }]) => {
      awardTogetherButterfly(roomCode, gameDateString());
    });
  }, [clearedTogether, roomCode]);

  if (connection === 'full') {
    return (
      <div className="flex flex-col flex-1 p-6 bg-background items-center justify-center w-full max-w-sm mx-auto gap-6 text-center">
        <h1 className="text-3xl font-display text-ink">Room {roomCode} is full</h1>
        <p className="font-body text-ink-2 font-bold">
          Two players are already in this room. Start your own and share the code.
        </p>
        <Button variant="primary" fullWidth onClick={() => router.push('/play/race/lobby')}>
          Back to Lobby
        </Button>
      </div>
    );
  }

  if (connection === 'not-found') {
    return (
      <div className="flex flex-col flex-1 p-6 bg-background items-center justify-center w-full max-w-sm mx-auto gap-6 text-center">
        <h1 className="text-3xl font-display text-ink">No room {roomCode}</h1>
        <p className="font-body text-ink-2 font-bold">
          Nobody is hosting that code. Check the letters, or start your own room.
        </p>
        <Button variant="primary" fullWidth onClick={() => router.push('/play/race/lobby')}>
          Back to Lobby
        </Button>
      </div>
    );
  }

  // ------------------------------------------------------------------ lobby
  if (raceState.status === 'lobby') {
    const segment = (active: boolean) =>
      `press min-h-[44px] rounded-xl font-body font-extrabold capitalize transition-colors ${
        active ? 'bg-accent text-on-accent shadow-[0_2px_0_var(--ink)]' : 'text-ink-2'
      }`;
    return (
      <div className="flex flex-col w-full max-w-lg mx-auto px-5 pb-8">
        <div className="flex items-end justify-between gap-3 mb-1">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-ink-2">Room code</p>
            <h1 className="text-4xl font-display text-ink tracking-[0.15em] tabular" aria-label={`Room ${roomCode.split('').join(' ')}`}>
              {roomCode}
            </h1>
          </div>
          <InviteButton roomCode={roomCode} />
        </div>
        <p className="font-body text-ink-2 mb-6 font-bold" aria-live="polite">
          {opponent ? `Round ${raceState.round}` : 'Waiting for your partner to join…'}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="!p-4 flex flex-col gap-2 text-center items-center">
            <h2 className="text-lg font-bold font-display text-ink truncate max-w-full">{me.name} (You)</h2>
            <span className={`text-sm font-extrabold ${me.isLeader || me.isReady ? 'text-accent-ink' : 'text-ink-2'}`}>
              {me.isLeader ? 'LEADER' : me.isReady ? 'READY' : 'NOT READY'}
            </span>
          </Card>
          <Card className="!p-4 flex flex-col gap-2 text-center items-center" noShadow={!opponent}>
            <h2 className="text-lg font-bold font-display text-ink truncate max-w-full">
              {opponent?.name || 'Waiting…'}
            </h2>
            {opponent ? (
              <span className={`text-sm font-extrabold ${opponent.isReady ? 'text-accent-ink' : 'text-ink-2'}`}>
                {opponent.isReady ? 'READY' : 'NOT READY'}
              </span>
            ) : (
              <ButterflySvg className="w-6 h-6 text-ink/25" />
            )}
          </Card>
        </div>

        {me.isLeader ? (
          <Card className="!p-4 flex flex-col gap-3 mb-6">
            <span id="mode-label" className="text-xs font-extrabold uppercase tracking-widest text-ink-2">Mode</span>
            <div role="radiogroup" aria-labelledby="mode-label" className="grid grid-cols-2 gap-1 p-1 bg-background border-2 border-ink rounded-2xl">
              {(['race', 'coop'] as RoomMode[]).map(m => (
                <button key={m} type="button" role="radio" aria-checked={me.mode === m} onClick={() => updateMyState({ mode: m })} className={segment(me.mode === m)}>
                  {m === 'race' ? 'Race' : 'Together'}
                </button>
              ))}
            </div>
            <span id="difficulty-label" className="text-xs font-extrabold uppercase tracking-widest text-ink-2 mt-1">Difficulty</span>
            <div role="radiogroup" aria-labelledby="difficulty-label" className="grid grid-cols-3 gap-1 p-1 bg-background border-2 border-ink rounded-2xl">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <button key={d} type="button" role="radio" aria-checked={me.difficulty === d} onClick={() => updateMyState({ difficulty: d })} className={segment(me.difficulty === d)}>
                  {d}
                </button>
              ))}
            </div>
          </Card>
        ) : (
          <div className="mb-6 py-3 text-center font-bold font-body text-ink text-lg capitalize border-2 border-ink rounded-2xl bg-surface">
            {roomMode === 'coop' ? 'Together' : 'Race'} · {roomDifficulty}
          </div>
        )}

        {me.isLeader ? (
          <Button variant="primary" fullWidth onClick={startRaceAsLeader} disabled={!opponent || !opponent.isReady} className="py-4 text-xl">
            {opponent?.isReady ? (isCoop ? 'Start Together' : 'Start Race') : 'Waiting for partner…'}
          </Button>
        ) : (
          <Button variant={me.isReady ? 'secondary' : 'primary'} fullWidth onClick={() => updateMyState({ isReady: !me.isReady })} aria-pressed={me.isReady} className="py-4 text-xl">
            {me.isReady ? 'Ready!' : 'Ready Up'}
          </Button>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------- countdown
  if (raceState.status === 'countdown' && raceState.startTime) {
    const secsLeft = Math.ceil((raceState.startTime - now) / 1000);
    return (
      <div className="flex flex-col flex-1 bg-background items-center justify-center h-screen w-full">
        <motion.div
          key={secsLeft}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          className="text-[120px] font-display text-accent-ink tabular" aria-live="assertive"
        >
          {secsLeft > 0 ? secsLeft : 'GO!'}
        </motion.div>
      </div>
    );
  }

  // ----------------------------------------------------------------- result
  if (isFinished) {
    return (
      <div className="flex flex-col flex-1 p-6 bg-background items-center justify-center w-full max-w-lg mx-auto">
        <motion.h1
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={softBounce}
          className="text-5xl font-display text-ink mb-8 text-center flex flex-col items-center gap-4"
        >
          {clearedTogether
            ? 'Cleared together!'
            : iWon
              ? 'You won!'
              : `${opponent?.name ?? 'Your partner'} won!`}
          {(iWon || clearedTogether) && <ButterflySvg className="w-16 h-16 text-accent-ink" />}
        </motion.h1>

        <Card className="w-full mb-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="font-bold text-ink">You ({me.name})</span>
            <ButterflyGarland count={me.progress} total={Math.max(me.total, 1)} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-bold text-ink">{opponent?.name || 'Partner'}</span>
            <ButterflyGarland
              count={opponent?.progress ?? 0}
              total={Math.max(opponent?.total ?? me.total, 1)}
            />
          </div>
        </Card>

        <div className="flex gap-4 w-full">
          <Button fullWidth variant="secondary" onClick={() => router.push('/')}>
            Back to Home
          </Button>
          {/* Broadcasts, so both players return to the lobby together. */}
          <Button fullWidth variant="primary" onClick={requestRematch}>
            Rematch
          </Button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- playing
  const durationSecs = raceDurationSeconds(roomDifficulty);
  const timeElapsed = Math.floor((now - (raceState.startTime || now)) / 1000);
  const timeLeft = Math.max(0, durationSecs - timeElapsed);

  return (
    <div className="flex flex-col bg-background relative w-full min-h-screen">
      {/* Status bar spans the full width so it does not read as a stray box
          floating in the middle of a desktop screen. */}
      <div className="flex-none w-full z-10 bg-surface border-b-2 border-ink shadow-[0_4px_0_0_var(--ink)]">
        <div className="w-full max-w-lg lg:max-w-5xl mx-auto p-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-8">
          <div
            className={`font-display text-2xl lg:text-3xl font-bold tabular-nums lg:w-24 shrink-0 transition-colors ${
              timeLeft <= 10 ? 'text-accent-ink' : 'text-ink'
            }`}
            role="timer"
            aria-label={`${timeLeft} seconds remaining`}
          >
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>

          {/* Both bars on every screen size. The opponent's bar used to be
              lg:hidden on the assumption their full board was shown instead,
              which left desktop players with no sense of the race at all. */}
          <div className="flex items-center gap-4 lg:gap-8 w-full">
            <ProgressBar
              label={isCoop ? `${me.name} (you)` : 'You'}
              value={me.progress}
              total={me.total}
              tone="bg-gold"
            />
            <ProgressBar
              label={opponent?.name || 'Partner'}
              value={opponent?.progress ?? 0}
              total={opponent?.total ?? 0}
              tone="bg-accent"
            />
          </div>

          {isCoop && (
            <span className="hidden lg:block shrink-0 font-body font-bold text-sm text-ink-2 whitespace-nowrap">
              Together
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 w-full max-w-lg lg:max-w-5xl mx-auto pt-4 pb-24 px-2 lg:px-8 flex flex-col lg:flex-row gap-8">
        <div className="flex-1 w-full">
          <GameClient
            key={raceState.seedStr}
            words={racePool}
            difficulty={roomDifficulty}
            seedStr={raceState.seedStr}
            onProgress={handleProgress}
            partnerFoundWords={isCoop ? opponent?.foundWords : undefined}
            hideGarland
            hideWinOverlay
            showTimer={false}
            allowHints={false}
            initialFoundWords={initialFoundWords}
          />
        </div>

        {/* Partner's board, desktop race only — co-op already shares one board,
            so building a second, hidden copy there was wasted work. Uses the
            ROUND difficulty so it reconstructs the grid the partner is solving. */}
        {!isCoop && raceState.seedStr && (
          <div className="hidden lg:flex flex-1 w-full flex-col items-center">
            <h3 className="font-display text-xl text-ink mb-4">{opponent?.name || 'Partner'}</h3>
            <PartnerGridDisplay
              key={raceState.seedStr}
              words={racePool}
              difficulty={roomDifficulty}
              seedStr={raceState.seedStr}
              foundWords={opponent?.foundWords || []}
            />
          </div>
        )}
      </div>

      <ChatWidget
        messages={chatMessages}
        onSend={sendChat}
        activeUserId={activeUserId}
        partnerName={opponent?.name || 'Partner'}
      />
    </div>
  );
}
