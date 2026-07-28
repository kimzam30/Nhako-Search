'use client';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useRaceRoom, raceDurationSeconds, TOGETHER, type RoomMode } from '@/lib/multiplayer/useRaceRoom';
import { GameClient } from '@/components/game/GameClient';
import { motion } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import { ButterflyGarland } from '@/components/game/ButterflyGarland';
import { supabase } from '@/lib/multiplayer/supabase';
import { ButterflySvg } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChatWidget } from '@/components/multiplayer/ChatWidget';
import { PartnerGridDisplay } from '@/components/game/PartnerGridDisplay';
import { getUserProfile } from '@/lib/auth/profile';
import { getStableGuestId } from '@/lib/multiplayer/identity';
import standardPool from '@/lib/words/standard.json';
import type { Difficulty } from '@/lib/puzzle/generator';

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

  const handleProgress = useCallback(
    (progress: number, foundWords: string[], total: number) => {
      updateMyState({ progress, total, foundWords });
    },
    [updateMyState]
  );

  // Only the leader writes history, so a match produces exactly one row.
  useEffect(() => {
    if (!isFinished || !opponent || !me.isLeader || !raceState.winner) return;
    if (raceState.winner === TOGETHER) return; // co-op is not a win/loss record
    import('@/lib/multiplayer/history').then(({ saveRaceHistory }) => {
      saveRaceHistory(me.id, opponent.id, raceState.winner!, roomDifficulty, roomDifficulty);
    });
  }, [isFinished, opponent, me.isLeader, me.id, raceState.winner, roomDifficulty]);

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

  if (connection === 'not-found') {
    return (
      <div className="flex flex-col flex-1 p-6 bg-background items-center justify-center w-full max-w-sm mx-auto gap-6 text-center">
        <h1 className="text-3xl font-display text-ink">No room {roomCode}</h1>
        <p className="font-body text-ink/70 font-bold">
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
    return (
      <div className="flex flex-col flex-1 p-4 pt-12 pb-24 bg-background items-center justify-start overflow-y-auto w-full max-w-lg mx-auto">
        <h1 className="text-4xl font-display text-ink mb-2 shrink-0">Room: {roomCode}</h1>
        <p className="font-body text-ink/70 mb-8 font-bold shrink-0">
          {opponent ? `Round ${raceState.round}` : 'Waiting for your partner to join...'}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full mb-8 shrink-0">
          <Card className="flex-1 flex flex-col gap-4 text-center items-center justify-center py-6">
            <h2 className="text-xl font-bold font-display text-ink">{me.name} (You)</h2>
            {me.isLeader ? (
              <div className="flex flex-col gap-2 w-full">
                <span className="text-xs font-bold uppercase tracking-widest text-ink/50">Mode</span>
                <div className="flex gap-2 w-full mb-2">
                  {(['race', 'coop'] as RoomMode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => updateMyState({ mode: m })}
                      className={`flex-1 py-2 rounded-xl border-2 font-body font-bold min-h-[44px] transition-colors ${
                        me.mode === m
                          ? 'bg-accent border-ink text-ink shadow-[0_2px_0_var(--ink)]'
                          : 'bg-surface border-ink/30 text-ink/70'
                      }`}
                    >
                      {m === 'race' ? 'Race' : 'Together'}
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-ink/50">Difficulty</span>
                {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                  <button
                    key={d}
                    onClick={() => updateMyState({ difficulty: d })}
                    className={`py-2 rounded-xl border-2 capitalize font-body font-bold w-full transition-colors ${
                      me.difficulty === d
                        ? 'bg-accent border-ink text-ink shadow-[0_2px_0_var(--ink)]'
                        : 'bg-surface border-ink/30 text-ink/70'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-4 font-bold font-body text-ink text-lg capitalize border-2 border-ink rounded-xl bg-surface w-full">
                {roomMode === 'coop' ? 'Together' : 'Race'} · {roomDifficulty}
              </div>
            )}

            {me.isLeader ? (
              <Button
                variant="primary"
                fullWidth
                onClick={startRaceAsLeader}
                disabled={!opponent || !opponent.isReady}
                className="mt-4"
              >
                {opponent?.isReady
                  ? isCoop
                    ? 'Start Together'
                    : 'Start Race'
                  : 'Waiting for Partner...'}
              </Button>
            ) : (
              <Button
                variant={me.isReady ? 'secondary' : 'primary'}
                fullWidth
                onClick={() => updateMyState({ isReady: !me.isReady })}
                className="mt-4"
              >
                {me.isReady ? 'Ready!' : 'Ready Up'}
              </Button>
            )}
          </Card>

          <Card className="flex-1 flex flex-col gap-4 text-center items-center justify-center py-8 bg-surface/50 opacity-80">
            <h2 className="text-xl font-bold font-display text-ink">
              {opponent?.name || 'Waiting...'}
            </h2>
            {opponent ? (
              <>
                <div
                  className={`w-full py-4 rounded-xl border-2 font-display text-xl bg-surface ${
                    opponent.isReady
                      ? 'text-accent border-accent bg-accent/10'
                      : 'border-ink/30 text-ink/50'
                  }`}
                >
                  {opponent.isReady ? 'READY' : 'NOT READY'}
                </div>
                <div className="w-full py-2 rounded-xl font-display text-sm bg-transparent text-ink/50">
                  {opponent.isLeader ? 'LEADER' : 'GUEST'}
                </div>
              </>
            ) : (
              <div className="relative w-16 h-16 my-auto">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                  className="absolute inset-0"
                >
                  <ButterflySvg className="w-8 h-8 text-ink/30 absolute -top-4 -left-4" />
                  <ButterflySvg className="w-6 h-6 text-ink/20 absolute -bottom-2 -right-2" />
                </motion.div>
              </div>
            )}
          </Card>
        </div>
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
          className="text-[120px] font-display text-accent drop-shadow-sm"
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
              ? 'You found more!'
              : `${opponent?.name ?? 'Your partner'} won!`}
          {(iWon || clearedTogether) && <ButterflySvg className="w-16 h-16 text-accent" />}
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
      <div className="flex-none flex flex-col w-full max-w-lg mx-auto p-4 z-10 bg-surface border-b-2 border-ink shadow-[0_4px_0_0_var(--ink)]">
        <div className="flex justify-between items-center mb-4">
          <div
            className={`font-display text-xl font-bold flex-1 transition-colors ${
              timeLeft <= 10 ? 'text-accent animate-pulse' : 'text-ink'
            }`}
          >
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1">
            <span className="text-xs font-bold text-ink uppercase tracking-wider mb-1 block">
              You
            </span>
            <div className="w-full h-3 bg-surface border-2 border-ink rounded-full overflow-hidden">
              <div
                className="h-full bg-gold transition-all duration-500"
                style={{ width: `${(me.progress / Math.max(me.total, 1)) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex-1 lg:hidden">
            <span className="text-xs font-bold text-ink uppercase tracking-wider mb-1 block">
              {opponent?.name || 'Partner'}
            </span>
            <div className="w-full h-3 bg-surface border-2 border-ink rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-500"
                style={{
                  width: `${((opponent?.progress ?? 0) / Math.max(opponent?.total ?? 1, 1)) * 100}%`,
                }}
              />
            </div>
          </div>
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
          />
        </div>

        {/* Partner's board, desktop only. Uses the ROOM difficulty so it
            reconstructs the same grid the partner is actually solving. */}
        <div className={`${isCoop ? 'hidden' : 'hidden lg:flex'} flex-1 w-full flex-col items-center`}>
          <h3 className="font-display text-xl text-ink mb-4">{opponent?.name || 'Partner'}</h3>
          <PartnerGridDisplay
            words={racePool}
            difficulty={roomDifficulty}
            seedStr={raceState.seedStr || 'daily-seed-123'}
            foundWords={opponent?.foundWords || []}
          />
        </div>
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
