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
    <div className="absolute top-28 left-0 right-0 pointer-events-none z-40 flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {messages.slice(-4).map(msg => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className={`w-fit max-w-[80%] px-5 py-2 rounded-full border-2 border-ink font-body text-ink font-bold shadow-[2px_3px_0_0_var(--ink)] flex gap-2 items-center ${msg.sender === activeUserId ? 'bg-accent' : 'bg-surface'}`}
          >
            <span className="opacity-70 text-xs uppercase tracking-wider">{msg.sender === activeUserId ? 'You' : partnerName}</span>
            <span>{msg.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
