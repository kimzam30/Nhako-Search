import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { softBounce } from '@/components/motion/springs';
import { ChatSvg } from '@/components/ui/Icons';

const QUICK_BANTER = ["GG!", "😤", "So close!", "Nice find!", "🦋", "Hurry up!"];

interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  time: number;
}

interface ChatWidgetProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  activeUserId: string;
  partnerName: string;
}

export function ChatWidget({ messages, onSend, activeUserId, partnerName }: ChatWidgetProps) {
  const [showTray, setShowTray] = useState(false);
  // Derived, not counted in effects: partner messages newer than the last
  // time the tray was opened.
  const [seenAt, setSeenAt] = useState(0);
  const unreadCount = showTray
    ? 0
    : messages.filter(m => m.sender !== activeUserId && m.time > seenAt).length;

  const toggleTray = () => {
    if (!showTray) setSeenAt(Date.now());
    setShowTray(!showTray);
  };

  return (
    <div className="fixed right-4 z-50 flex flex-col items-end gap-4 pointer-events-none" style={{ bottom: 'max(1rem, calc(var(--safe-bottom) + 0.5rem))' }}>
      {/* Toast Messages - Floating up from the widget */}
      <div className="flex flex-col items-end gap-2 w-[260px] pointer-events-none" aria-live="polite">
        <AnimatePresence>
          {messages.slice(-3).map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.8, x: 20, y: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              transition={softBounce}
              className={`px-4 py-2 rounded-2xl border-2 border-ink font-body text-ink font-bold shadow-[2px_3px_0_0_var(--ink)] flex flex-col items-start gap-0.5 ${msg.sender === activeUserId ? 'bg-accent self-end' : 'bg-surface self-start'}`}
            >
              <span className="opacity-70 text-[10px] leading-none uppercase tracking-wider">{msg.sender === activeUserId ? 'You' : partnerName}</span>
              <span className="text-sm">{msg.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Preset Tray */}
      <AnimatePresence>
        {showTray && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="bg-surface p-4 rounded-3xl border-2 border-ink shadow-[4px_5px_0_0_var(--ink)] flex flex-wrap gap-2 w-64 justify-end pointer-events-auto origin-bottom-right"
          >
            {QUICK_BANTER.map(text => (
              <motion.button
                key={text}
                whileTap={{ scale: 0.9 }} transition={softBounce}
                onClick={() => { onSend(text); setSeenAt(Date.now()); setShowTray(false); }}
                className="bg-accent-soft px-3 py-2 rounded-xl border-2 border-ink font-body text-ink font-bold text-sm min-h-[44px] shadow-[2px_2px_0_0_var(--ink)] active:translate-y-[2px] active:shadow-none"
              >
                {text}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Button */}
      <motion.button 
        whileTap={{ scale: 0.9 }} transition={softBounce}
        onClick={toggleTray}
        aria-label={unreadCount > 0 ? `Quick messages, ${unreadCount} new` : 'Quick messages'}
        aria-expanded={showTray}
        className="relative w-14 h-14 rounded-full bg-gold border-2 border-ink shadow-[4px_5px_0_0_var(--ink)] active:translate-y-1 active:shadow-[0px_0px_0_0_var(--ink)] flex items-center justify-center pointer-events-auto"
      >
        <ChatSvg className="w-6 h-6 text-on-accent" />
        
        {/* Unread Badge */}
        <AnimatePresence>
          {unreadCount > 0 && !showTray && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-2 -right-2 bg-accent w-6 h-6 rounded-full border-2 border-ink flex items-center justify-center text-ink font-bold text-xs"
            >
              {unreadCount}
            </motion.div>
          )}
        </AnimatePresence>

        {/* New message pulse effect */}
        {unreadCount > 0 && !showTray && (
          <motion.div 
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 rounded-full border-2 border-gold pointer-events-none"
          />
        )}
      </motion.button>
    </div>
  );
}
