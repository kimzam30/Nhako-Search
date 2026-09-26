'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';

/*
 * App-wide toasts: short, non-blocking news (a butterfly caught, tokens
 * earned, a friend request). Auto-dismiss after a few seconds, announced
 * politely to screen readers, stacked at the top so they never cover the
 * board's thumb zone or the tab bar.
 */

export interface ToastItem {
  id: number;
  title: string;
  body?: string;
  icon?: ReactNode;
  ms?: number;
}

let items: ToastItem[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

function emit() {
  listeners.forEach(l => l());
}

export function toast(t: Omit<ToastItem, 'id'>) {
  const item = { ...t, id: nextId++ };
  items = [...items.slice(-1), item];
  emit();
  return item.id;
}

function dismiss(id: number) {
  items = items.filter(i => i.id !== id);
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function Item({ item }: { item: ToastItem }) {
  useEffect(() => {
    const t = window.setTimeout(() => dismiss(item.id), item.ms ?? 4200);
    return () => window.clearTimeout(t);
  }, [item.id, item.ms]);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.15 } }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      className="w-full max-w-sm pointer-events-auto"
    >
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        className="w-full flex items-center gap-3 text-left px-3 py-2.5 bg-surface border-2 border-line shadow-[3px_4px_0_0_var(--line)]"
        style={{ borderRadius: '18px 12px 20px 14px' }}
      >
        {item.icon && <span className="shrink-0 w-10 h-10 flex items-center justify-center">{item.icon}</span>}
        <span className="min-w-0 flex flex-col">
          <span className="font-display font-bold text-ink leading-tight">{item.title}</span>
          {item.body && <span className="text-sm font-bold text-ink-2 leading-snug">{item.body}</span>}
        </span>
      </button>
    </motion.li>
  );
}

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => items);
  return (
    <ol
      aria-live="polite"
      className="fixed left-0 right-0 z-[80] flex flex-col items-center gap-2 px-4 pointer-events-none"
      style={{ top: 'max(0.75rem, var(--safe-top))' }}
    >
      <AnimatePresence initial={false}>
        {list.map(i => (
          <Item key={i.id} item={i} />
        ))}
      </AnimatePresence>
    </ol>
  );
}
