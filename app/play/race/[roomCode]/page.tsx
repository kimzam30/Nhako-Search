'use client';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRaceRoom, raceDurationSeconds, TOGETHER, OUT_OF_TIME, type RoomMode } from '@/lib/multiplayer/useRaceRoom';
import { getCurrentUser } from '@/lib/auth/session';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { THEMES } from '@/lib/words/themes';
import { earnTokens } from '@/lib/rewards/wallet';
import { rewardFor, total } from '@/lib/rewards/economy';
import { updateJournal } from '@/lib/rewards/journal';
import { refreshSummary } from '@/lib/data/player';
import { requestById, REQUEST_MESSAGES } from '@/lib/social/friends';
import { toast } from '@/components/ui/Toast';
import { GameClient } from '@/components/game/GameClient';
import { motion } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import { ButterflyGarland } from '@/components/game/ButterflyGarland';
import { ButterflySvg, ShareSvg, TokenSvg, UserPlusSvg } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChatDock, ChatFab } from '@/components/multiplayer/ChatWidget';
import { PartnerGridDisplay } from '@/components/game/PartnerGridDisplay';
import { Petals } from '@/components/game/Petals';
import { useAmbientAudio } from '@/components/sound/AmbientAudioProvider';
import { getUserProfile } from '@/lib/auth/profile';
import { useSetGameTitle } from '@/lib/nav/gameTitle';
import { getStableGuestId } from '@/lib/multiplayer/identity';
import type { Difficulty } from '@/lib/puzzle/generator';

/** The round's word theme, derived from its seed so both players agree on it. */
function themeForSeed(seed: string | undefined) {
  if (!seed) return THEMES[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  return THEMES[h % THEMES.length];
}

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
          {total > 0 ? `${value}/${total}` : '–'}
        </span>
      </div>
      <div
        className="w-full h-3 bg-background border-2 border-line rounded-full overflow-hidden"
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
      className="press shrink-0 flex items-center gap-2 min-h-[44px] px-4 rounded-full border-2 border-line bg-surface font-body font-extrabold text-ink"
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
      const [profile, user] = await Promise.all([getUserProfile(), getCurrentUser()]);
      if (cancelled) return;
      // A guest keeps the same id across a reload so they rejoin the room
      // instead of arriving as a brand-new player.
      setUserId(user?.id ?? getStableGuestId());
      setUserName(profile.displayName);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!userId) return <PageSkeleton title={`room ${roomCode}`} />;
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
    sendTyping,
    partnerTyping,
    addSystemMessage,
    startRaceAsLeader,
    requestRematch,
  } = useRaceRoom(roomCode, activeUserId, activeUserName);

  const chatProps = {
    messages: chatMessages,
    onSend: sendChat,
    onTyping: sendTyping,
    partnerTyping,
    meId: activeUserId,
    partnerName: opponentName(),
  };
  function opponentName() {
    return raceState.opponent?.name || 'Partner';
  }

  const { me, opponent } = raceState;
  const isFinished = raceState.status === 'finished';
  const isCoop = roomMode === 'coop';
  const clearedTogether = isFinished && raceState.winner === TOGETHER;
  const outOfTime = isFinished && raceState.winner === OUT_OF_TIME;
  const iWon = isFinished && raceState.winner === activeUserId;
  // The countdown and the round have no heading of their own (the lobby and
  // result screens do), so the game bar carries the page's h1 while they run.
  const inRound = raceState.status === 'countdown' || raceState.status === 'playing';
  useSetGameTitle(inRound ? (isCoop ? 'Together' : 'Race') : '');

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // Only tick while a clock is actually on screen.
    if (raceState.status !== 'playing' && raceState.status !== 'countdown') return;
    const int = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(int);
  }, [raceState.status]);

  // Game audio: a tick per countdown second, a chime on GO, and a fanfare
  // (or a soft pop) when the round is decided.
  const { playSfx } = useAmbientAudio();
  const countdownSecs =
    raceState.status === 'countdown' && raceState.startTime ? Math.ceil((raceState.startTime - now) / 1000) : null;
  useEffect(() => {
    if (countdownSecs === null) return;
    playSfx(countdownSecs > 0 ? 'countdown' : 'go');
  }, [countdownSecs, playSfx]);
  const celebrate = isFinished && (iWon || clearedTogether);
  useEffect(() => {
    if (!isFinished) return;
    playSfx(celebrate ? 'win' : 'pop');
  }, [isFinished, celebrate, playSfx]);

  // The whole pool is passed in; the generator picks a deterministic subset
  // from the shared seed, so both players build an identical grid.
  // Each round draws from a theme picked by its seed, so rematches vary.
  const roundTheme = themeForSeed(raceState.seedStr);
  const racePool = roundTheme.words[roomDifficulty] ?? roundTheme.words.easy;

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
   * Only the leader writes history, but "leader-only" alone is not enough to
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
    // Co-op is not a win/loss record, cleared or not.
    if (raceState.winner === TOGETHER || raceState.winner === OUT_OF_TIME) return;
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

  // Room events as quiet lines in the chat, so the thread tells the story.
  const opponentId = opponent?.id;
  const prevOpponent = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevOpponent.current;
    prevOpponent.current = opponentId;
    if (opponentId && opponentId !== prev) addSystemMessage(`${opponent?.name ?? 'Your partner'} joined`, `join-${opponentId}-${raceState.round}`);
    if (!opponentId && prev) addSystemMessage('Your partner left the room');
    // Names can arrive after ids; only the id change matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opponentId, addSystemMessage]);
  useEffect(() => {
    if (raceState.status === 'countdown') {
      addSystemMessage(`Round ${raceState.round} · ${isCoop ? 'Together' : 'Race'} · ${roomDifficulty}`, `round-${raceState.round}`);
    }
  }, [raceState.status, raceState.round, isCoop, roomDifficulty, addSystemMessage]);

  // Tokens for the round, once per round, whoever won.
  const [roundReward, setRoundReward] = useState<number | null>(null);
  const rewardedRoundRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isFinished || !raceState.winner || rewardedRoundRef.current === raceState.round) return;
    rewardedRoundRef.current = raceState.round;
    const lines = clearedTogether
      ? rewardFor({ mode: 'together', difficulty: roomDifficulty })
      : outOfTime
        ? [{ label: 'Good try', amount: 2 }]
        : rewardFor({ mode: iWon ? 'race-win' : 'race-loss', difficulty: roomDifficulty });
    if (clearedTogether) updateJournal(j => void j.together++);
    const amount = total(lines);
     
    setRoundReward(amount);
    void earnTokens(amount).then(() => refreshSummary());
    addSystemMessage(
      clearedTogether ? 'Cleared together!' : outOfTime ? 'Out of time' : iWon ? `${me.name} won round ${raceState.round}` : `${opponent?.name ?? 'Your partner'} won round ${raceState.round}`,
      `result-${raceState.round}`
    );
  }, [isFinished, raceState.winner, raceState.round, clearedTogether, outOfTime, iWon, roomDifficulty, addSystemMessage, me.name, opponent?.name]);

  // Friend request to the partner, from the results screen.
  const [friendState, setFriendState] = useState<'idle' | 'sending' | 'done'>('idle');
  const canAddFriend = !!opponent && !opponent.id.startsWith('guest-') && !activeUserId.startsWith('guest-');
  const addFriend = async () => {
    if (!opponent) return;
    setFriendState('sending');
    const result = await requestById(opponent.id);
    setFriendState(result === 'sent' || result === 'accepted' || result === 'already' ? 'done' : 'idle');
    toast({ title: result === 'accepted' ? `You and ${opponent.name} are friends` : result === 'sent' ? 'Friend request sent' : 'Friends', body: REQUEST_MESSAGES[result] });
  };

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
        active ? 'bg-accent text-on-accent shadow-[0_2px_0_var(--line)]' : 'text-ink-2'
      }`;
    return (
      <div className="w-full max-w-lg lg:max-w-5xl mx-auto px-5 pb-8 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:items-start">
      <div className="flex flex-col">
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
            <div role="radiogroup" aria-labelledby="mode-label" className="grid grid-cols-2 gap-1 p-1 bg-background border-2 border-line rounded-2xl">
              {(['race', 'coop'] as RoomMode[]).map(m => (
                <button key={m} type="button" role="radio" aria-checked={me.mode === m} onClick={() => updateMyState({ mode: m })} className={segment(me.mode === m)}>
                  {m === 'race' ? 'Race' : 'Together'}
                </button>
              ))}
            </div>
            <span id="difficulty-label" className="text-xs font-extrabold uppercase tracking-widest text-ink-2 mt-1">Difficulty</span>
            <div role="radiogroup" aria-labelledby="difficulty-label" className="grid grid-cols-3 gap-1 p-1 bg-background border-2 border-line rounded-2xl">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <button key={d} type="button" role="radio" aria-checked={me.difficulty === d} onClick={() => updateMyState({ difficulty: d })} className={segment(me.difficulty === d)}>
                  {d}
                </button>
              ))}
            </div>
          </Card>
        ) : (
          <div className="mb-6 py-3 text-center font-bold font-body text-ink text-lg capitalize border-2 border-line rounded-2xl bg-surface">
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
        {/* Talk while you wait: beside the room on desktop, under it on phones. */}
        <ChatDock {...chatProps} className="mt-8 lg:mt-0 h-[380px] lg:h-[calc(100dvh-8rem)] lg:max-h-[640px] lg:sticky lg:top-6" />
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
          initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
          animate={{ scale: 1, opacity: 1, rotate: -3 }}
          transition={{ type: 'spring', stiffness: 500, damping: 16 }}
          className="flex items-center justify-center min-w-[180px] h-[180px] px-6 border-[3px] border-line bg-accent text-on-accent shadow-[6px_7px_0_0_var(--line)] text-[96px] font-display font-bold tabular"
          style={{ borderRadius: '63% 37% 54% 46% / 55% 45% 62% 38%' }}
          aria-live="assertive"
        >
          {secsLeft > 0 ? secsLeft : 'GO!'}
        </motion.div>
      </div>
    );
  }

  // ----------------------------------------------------------------- result
  if (isFinished) {
    return (
      <div className="w-full max-w-lg lg:max-w-5xl mx-auto px-6 pt-6 pb-8 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:items-start">
      <div className="flex flex-col items-center">
        {celebrate && <Petals />}
        <motion.h1
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={softBounce}
          className="text-5xl font-display text-ink mb-8 text-center flex flex-col items-center gap-4"
        >
          {clearedTogether
            ? 'Cleared together!'
            : outOfTime
              ? 'Out of time'
              : iWon
                ? 'You won!'
                : `${opponent?.name ?? 'Your partner'} won!`}
          {(iWon || clearedTogether) && <ButterflySvg className="w-16 h-16 text-accent-ink" />}
        </motion.h1>
        {outOfTime && (
          <p className="-mt-4 mb-8 font-body font-bold text-ink-2 text-center tabular">
            You found {new Set([...me.foundWords, ...(opponent?.foundWords ?? [])]).size} of {me.total} words together.
          </p>
        )}

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

        {roundReward !== null && (
          <p className="-mt-4 mb-6 flex items-center gap-1.5 font-display font-bold text-xl text-ink tabular" aria-live="polite">
            <TokenSvg className="w-7 h-7 token-bump" />+{roundReward} tokens
          </p>
        )}

        <div className="flex gap-4 w-full">
          <Button fullWidth variant="secondary" onClick={() => router.replace('/')}>
            Back to Home
          </Button>
          {/* Broadcasts, so both players return to the lobby together. */}
          <Button fullWidth variant="primary" onClick={requestRematch}>
            Rematch
          </Button>
        </div>
        {canAddFriend && (
          <button
            type="button"
            onClick={addFriend}
            disabled={friendState !== 'idle'}
            className="press mt-4 flex items-center gap-2 min-h-[44px] px-4 rounded-full border-2 border-line bg-surface font-body font-extrabold text-ink disabled:opacity-60"
          >
            <UserPlusSvg className="w-5 h-5" />
            {friendState === 'done' ? 'Friend request sent' : friendState === 'sending' ? 'Sending…' : `Add ${opponent!.name} as a friend`}
          </button>
        )}
      </div>
        <ChatDock {...chatProps} className="mt-8 lg:mt-0 h-[340px] lg:h-[calc(100dvh-8rem)] lg:max-h-[640px] lg:sticky lg:top-6" />
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
      <div className="flex-none w-full z-10 bg-surface border-b-2 border-line shadow-[0_4px_0_0_var(--line)]">
        <div className="w-full max-w-lg md:max-w-3xl lg:max-w-6xl mx-auto p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-8">
          <div
            className={`font-display text-2xl lg:text-3xl font-bold tabular-nums md:w-20 lg:w-24 shrink-0 transition-colors ${
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

          <span className="hidden md:block shrink-0 font-body font-bold text-sm text-ink-2 whitespace-nowrap">
            {isCoop ? 'Together · ' : ''}
            {roundTheme.name}
          </span>
        </div>
      </div>

      {/* Same column widths as solo play. This used to stay max-w-lg up to
          1024px while GameClient already put the word list beside the board
          from 768px, which squeezed a tablet's board to 280px (solo: 552px). */}
      <div className="flex-1 w-full max-w-lg md:max-w-3xl lg:max-w-6xl mx-auto pt-4 pb-24 px-2 lg:px-8 flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0 w-full">
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

        {/* Partner's board, desktop race only; co-op already shares one board,
            so building a second, hidden copy there was wasted work. Uses the
            ROUND difficulty so it reconstructs the grid the partner is solving.
            A fixed side preview, not an equal half: as a flex-1 twin it left
            the player's own board at 184px on a 1440px screen. */}
        {!isCoop && raceState.seedStr && (
          <div className="hidden lg:flex flex-none w-56 xl:w-72 flex-col items-center">
            <h2 className="font-display text-lg text-ink mb-3 truncate max-w-full">{opponent?.name || 'Partner'}</h2>
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

      <ChatFab {...chatProps} />
    </div>
  );
}
