'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/** Set once the player has found a word, so the guide never shows again. */
export const DRAG_GUIDE_KEY = 'nhako_drag_guide_done';

export function dragGuideDone(): boolean {
  try {
    return localStorage.getItem(DRAG_GUIDE_KEY) === '1';
  } catch {
    return true; // blocked storage: never nag on every board
  }
}

export function markDragGuideDone() {
  try {
    localStorage.setItem(DRAG_GUIDE_KEY, '1');
  } catch {
    /* private mode */
  }
}

interface Cell {
  x: number;
  y: number;
}

/*
 * First-run coach mark: a ghost finger presses on a word's first letter and
 * drags to its last, drawing the capsule as it goes, on a loop. It sits over
 * the grid without catching touches; the board hides it on the first touch.
 * With reduced motion the capsule and caption just sit there.
 */
export function DragGuide({
  gridRef,
  from,
  to,
  cols,
  rows,
}: {
  gridRef: RefObject<HTMLDivElement | null>;
  from: Cell;
  to: Cell;
  cols: number;
  rows: number;
}) {
  const selfRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const grid = gridRef.current;
    const host = selfRef.current?.parentElement;
    if (!grid || !host) return;
    const measure = () => {
      const g = grid.getBoundingClientRect();
      const h = host.getBoundingClientRect();
      setBox({ left: g.left - h.left, top: g.top - h.top, width: g.width, height: g.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [gridRef]);

  const px = (c: Cell) => (box ? { x: ((c.x + 0.5) / cols) * box.width, y: ((c.y + 0.5) / rows) * box.height } : { x: 0, y: 0 });
  const a = px(from);
  const b = px(to);
  const cell = box ? box.width / cols : 0;

  return (
    <div ref={selfRef} className="pointer-events-none absolute z-30" style={box ?? { display: 'none' }} aria-hidden="true">
      {box && (
        <>
          <svg className="absolute inset-0 overflow-visible" width={box.width} height={box.height}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} pathLength={1} className="drag-guide-line" strokeWidth={cell * 0.82} />
          </svg>
          <span
            className="drag-guide-finger absolute -ml-5 -mt-5 w-10 h-10 rounded-full border-[3px] border-line bg-surface/70"
            style={{ ['--x0' as string]: `${a.x}px`, ['--y0' as string]: `${a.y}px`, ['--x1' as string]: `${b.x}px`, ['--y1' as string]: `${b.y}px` }}
          />
          <span
            className="nera-pop absolute left-1/2 -translate-x-1/2 -top-3 -translate-y-full whitespace-nowrap px-4 py-1.5 rounded-full border-2 border-line bg-gold text-on-accent font-body font-extrabold text-sm shadow-[3px_4px_0_0_var(--line)]"
          >
            Drag from the first letter to the last
          </span>
        </>
      )}
    </div>
  );
}
