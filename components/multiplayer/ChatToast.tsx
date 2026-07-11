import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  time: number;
}

interface ChatToastProps {
  messages: ChatMessage[];
  activeUserId: string;
  partnerName: string;
}

export function ChatToast({ messages, activeUserId, partnerName }: ChatToastProps) {
  return (
    <div className="z-50 flex flex-col items-center gap-2 px-4 w-full pointer-events-none">
      <AnimatePresence>
        {messages.slice(-4).map(msg => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className={`w-fit max-w-[90%] px-5 py-2 rounded-2xl border-2 border-ink font-body text-ink font-bold shadow-[2px_3px_0_0_var(--ink)] flex flex-col items-start gap-0.5 ${msg.sender === activeUserId ? 'bg-accent' : 'bg-surface'}`}
          >
            <span className="opacity-70 text-[10px] leading-none uppercase tracking-wider">{msg.sender === activeUserId ? 'You' : partnerName}</span>
            <span className="text-base break-words w-full">{msg.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
