'use client';

import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { useEffect, useId, useRef, type ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Visible heading; also the dialog's accessible name. */
  title?: ReactNode;
  /** Accessible name when there is no visible title. */
  label?: string;
  children: ReactNode;
}

/*
 * A native-style bottom sheet: slides up from the bottom edge, can be dragged
 * down or tapped outside to dismiss, closes on Escape, and keeps its content
 * clear of the home indicator. On wide screens it is centred and width-capped
 * rather than stretched edge to edge.
 *
 * Motion: enter is a critically damped spring from off-screen, exit is a
 * faster tween the same way out. With reduced motion, MotionConfig in the
 * layout turns the slide into a plain cut.
 */
export function Sheet({ open, onClose, title, label, children }: SheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    // Move focus into the sheet so keyboard and screen-reader users land in it.
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // The page behind a sheet should not scroll under the finger.
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    // Commit on distance or on a flick, like a native sheet.
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center" role="presentation">
          <motion.div
            className="absolute inset-0 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : label}
            tabIndex={-1}
            className="relative w-full max-w-lg bg-surface border-2 border-b-0 border-ink rounded-t-[28px] outline-none shadow-[0_-4px_0_0_var(--ink)] max-h-[88dvh] flex flex-col"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {/* The grab area is the handle row only, so sliders and lists
                inside the sheet keep their own gestures. */}
            <div
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={e => dragControls.start(e)}
            >
              <span className="w-10 h-1.5 rounded-full bg-ink/25" aria-hidden="true" />
            </div>
            {title && (
              <h2 id={titleId} className="px-6 pb-2 font-display text-2xl text-ink">
                {title}
              </h2>
            )}
            <div
              className="px-6 overflow-y-auto overscroll-contain"
              style={{ paddingBottom: 'max(1.5rem, calc(var(--safe-bottom) + 1rem))' }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
