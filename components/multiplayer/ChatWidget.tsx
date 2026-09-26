'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChatSvg, SendSvg } from '@/components/ui/Icons';
import { Sheet } from '@/components/ui/Sheet';
import { CHAT_MAX, SYSTEM, type ChatMessage } from '@/lib/multiplayer/useRaceRoom';

/*
 * Room chat, in two presentations of one thread:
 *
 *  - ChatDock: a real panel for the lobby and the results screen, where
 *    talking is the point: beside the room on desktop, a card under it on
 *    phones.
 *  - ChatFab: during a round the board has the screen, so chat folds into a
 *    button with an unread count; a new message peeks out above it for a few
 *    seconds, and tapping opens the full thread in a sheet.
 *
 * Messages persist for the room session (useRaceRoom), grouped by sender, with
 * a typing indicator, quick reactions and free text up to 140 characters.
 */

export interface ChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => boolean;
  onTyping?: () => void;
  partnerTyping?: boolean;
  meId: string;
  partnerName: string;
}

const QUICK = ['👋', '😂', '🔥', '🦋', 'GG!', 'So close!', 'Nice find!', 'One more?'];

const time = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

function Thread({ messages, onSend, onTyping, partnerTyping, meId, partnerName, autoFocus = false }: ChatProps & { autoFocus?: boolean }) {
  const [draft, setDraft] = useState('');
  const [limited, setLimited] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const stick = useRef(true);
  const inputId = useId();

  // Follow new messages, unless the reader has scrolled up to look back.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, partnerTyping]);

  useEffect(() => {
    if (!limited) return;
    const t = window.setTimeout(() => setLimited(false), 2500);
    return () => window.clearTimeout(t);
  }, [limited]);

  const send = (text: string) => {
    if (!text.trim()) return;
    stick.current = true;
    if (onSend(text)) setDraft('');
    else setLimited(true);
  };

  // Group consecutive messages from one sender, like any messenger.
  const groups = useMemo(() => {
    const out: { sender: string; items: ChatMessage[] }[] = [];
    for (const m of messages) {
      const last = out[out.length - 1];
      if (last && last.sender === m.sender && m.sender !== SYSTEM && m.time - last.items[last.items.length - 1].time < 120_000) {
        last.items.push(m);
      } else out.push({ sender: m.sender, items: [m] });
    }
    return out;
  }, [messages]);

  return (
    <div className="flex flex-col min-h-0 h-full">
      <ol
        ref={listRef}
        onScroll={e => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-3 px-1 py-2"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.length === 0 && (
          <li className="m-auto text-center text-sm font-bold text-ink-2 px-6">
            Say hi to {partnerName}, or send a reaction below.
          </li>
        )}
        {groups.map(g =>
          g.sender === SYSTEM ? (
            g.items.map(m => (
              <li key={m.id} className="self-center px-3 py-1 rounded-full bg-ink/[0.06] text-xs font-extrabold text-ink-2 text-center">
                {m.text}
              </li>
            ))
          ) : (
            <li key={g.items[0].id} className={`flex flex-col gap-1 max-w-[85%] ${g.sender === meId ? 'self-end items-end' : 'self-start items-start'}`}>
              <span className="px-1 text-[11px] font-extrabold text-ink-2">
                {g.sender === meId ? 'You' : partnerName} · {time(g.items[0].time)}
              </span>
              {g.items.map(m => {
                const emojiOnly = /^\p{Extended_Pictographic}{1,3}$/u.test(m.text);
                return emojiOnly ? (
                  <span key={m.id} className="text-4xl leading-none px-1" aria-label={m.text}>
                    {m.text}
                  </span>
                ) : (
                  <span
                    key={m.id}
                    className={`px-3 py-2 border-2 border-line font-body font-bold text-[15px] leading-snug break-words [overflow-wrap:anywhere] ${
                      g.sender === meId
                        ? 'bg-accent text-on-accent rounded-[18px] rounded-br-[6px]'
                        : 'bg-surface text-ink rounded-[18px] rounded-bl-[6px]'
                    }`}
                  >
                    {m.text}
                  </span>
                );
              })}
            </li>
          )
        )}
        {partnerTyping && (
          <li className="self-start flex items-center gap-1 px-3 py-2.5 rounded-[18px] rounded-bl-[6px] border-2 border-line bg-surface" aria-label={`${partnerName} is typing`}>
            {[0, 1, 2].map(i => (
              <span key={i} className="typing-dot w-2 h-2 rounded-full bg-ink-2" />
            ))}
          </li>
        )}
      </ol>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-2 -mx-1 px-1" role="group" aria-label="Quick reactions">
        {QUICK.map(q => (
          <button
            key={q}
            type="button"
            onClick={() => send(q)}
            className="press shrink-0 min-h-[40px] min-w-[44px] px-3 rounded-full border-2 border-line/40 bg-background font-body font-extrabold text-sm text-ink"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        onSubmit={e => {
          e.preventDefault();
          send(draft);
        }}
        className="flex items-end gap-2"
      >
        <label htmlFor={inputId} className="sr-only">
          Message {partnerName}
        </label>
        <div className="relative flex-1 min-w-0">
          <input
            id={inputId}
            value={draft}
            onChange={e => {
              setDraft(e.target.value.slice(0, CHAT_MAX));
              onTyping?.();
            }}
            placeholder={`Message ${partnerName}…`}
            maxLength={CHAT_MAX}
            autoComplete="off"
            enterKeyHint="send"
            autoFocus={autoFocus}
            className="w-full min-h-[48px] pl-4 pr-12 bg-background border-2 border-line rounded-full font-body font-bold text-base text-ink outline-none focus:border-accent placeholder:text-ink-2/70"
          />
          {draft.length > CHAT_MAX - 30 && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-extrabold text-ink-2 tabular" aria-hidden="true">
              {CHAT_MAX - draft.length}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Send"
          className="press shrink-0 w-12 h-12 flex items-center justify-center rounded-full border-2 border-line bg-accent text-on-accent shadow-[2px_3px_0_0_var(--line)] disabled:opacity-40 disabled:shadow-none"
        >
          <SendSvg className="w-5 h-5" />
        </button>
      </form>
      <p role="status" className="min-h-5 pt-1 text-xs font-bold text-accent-ink">
        {limited ? 'Easy there! Wait a moment before sending more.' : ''}
      </p>
    </div>
  );
}

/** Lobby and results: the chat as a proper panel. */
export function ChatDock(props: ChatProps & { className?: string }) {
  const { className = '', ...rest } = props;
  return (
    <section
      aria-label="Chat"
      className={`flex flex-col min-h-0 p-3 pb-1 bg-surface border-2 border-line shadow-[4px_5px_0_0_var(--line)] ${className}`}
      style={{ borderRadius: '22px 14px 24px 16px' }}
    >
      <h2 className="flex items-center gap-2 px-1 pb-1 font-display font-bold text-lg text-ink">
        <ChatSvg className="w-5 h-5 text-accent-ink" />
        Chat
      </h2>
      <Thread {...rest} />
    </section>
  );
}

/** In a round: a button with an unread count and a peek of the newest line. */
export function ChatFab(props: ChatProps) {
  const { messages, meId, partnerName } = props;
  const [open, setOpen] = useState(false);
  const [seenCount, setSeenCount] = useState(messages.length);
  const [peek, setPeek] = useState<ChatMessage | null>(null);
  const lastSeenId = useRef(messages[messages.length - 1]?.id);

  const incoming = messages.filter(m => m.sender !== meId && m.sender !== SYSTEM);
  const unread = open ? 0 : Math.max(0, incoming.length - messages.slice(0, seenCount).filter(m => m.sender !== meId && m.sender !== SYSTEM).length);

  // A new message from the partner peeks out for a few seconds.
  const newest = messages[messages.length - 1];
  useEffect(() => {
    if (!newest || newest.id === lastSeenId.current) return;
    lastSeenId.current = newest.id;
    if (open || newest.sender === meId || newest.sender === SYSTEM) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPeek(newest);
    const t = window.setTimeout(() => setPeek(p => (p?.id === newest.id ? null : p)), 4000);
    return () => window.clearTimeout(t);
  }, [newest, open, meId]);

  const openSheet = () => {
    setPeek(null);
    setOpen(true);
  };

  return (
    <>
      <div className="fixed right-4 z-50 flex flex-col items-end gap-2 pointer-events-none" style={{ bottom: 'max(1rem, calc(var(--safe-bottom) + 0.75rem))' }}>
        <AnimatePresence>
          {peek && (
            <motion.button
              key={peek.id}
              type="button"
              onClick={openSheet}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="pointer-events-auto max-w-[240px] text-left px-3 py-2 bg-surface border-2 border-line rounded-[18px] rounded-br-[6px] shadow-[3px_4px_0_0_var(--line)]"
            >
              <span className="block text-[11px] font-extrabold text-ink-2">{partnerName}</span>
              <span className="block font-bold text-ink text-sm line-clamp-2 break-words">{peek.text}</span>
            </motion.button>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={openSheet}
          aria-label={unread > 0 ? `Chat, ${unread} new` : 'Chat'}
          aria-haspopup="dialog"
          className="press pointer-events-auto relative w-14 h-14 rounded-full bg-gold border-2 border-line shadow-[4px_5px_0_0_var(--line)] flex items-center justify-center"
        >
          <ChatSvg className="w-6 h-6 text-on-accent" />
          {unread > 0 && (
            <span className="absolute -top-2 -right-2 min-w-6 h-6 px-1 rounded-full border-2 border-line bg-accent text-on-accent font-extrabold text-xs flex items-center justify-center tabular">
              {unread}
            </span>
          )}
        </button>
      </div>

      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          setSeenCount(messages.length);
        }}
        title={`Chat with ${partnerName}`}
      >
        <div className="h-[min(60dvh,460px)] flex flex-col">
          <Thread {...props} />
        </div>
      </Sheet>
    </>
  );
}
