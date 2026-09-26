'use client';

import { useGameLogic } from '@/lib/puzzle/useGameLogic';
import { LetterCell } from './LetterCell';
import { useId, useMemo, type CSSProperties } from 'react';
import { motion } from 'framer-motion';

/** Stable 0..1 noise from a string + index, so a word always wobbles the same way. */
function hashNoise(seed: string, index: number): number {
  let h = (2166136261 ^ index) >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

const SKETCH_SEGMENTS = 6;

/** Capsule colour for the i-th placed word: a fixed 8-colour cycle (--word-1..8). */
export function wordColor(i: number): string {
  return `var(--word-${(i % 8) + 1})`;
}

/**
 * A straight run from (x1,y1) to (x2,y2), drawn as a slightly uneven polyline
 * so it reads as hand-drawn. Deviation tapers to zero at both ends so the
 * stroke still starts and finishes exactly on the letters.
 */
function sketchPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: string,
  amplitude: number
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  // Unit perpendicular, used to push points off the true line.
  const px = -dy / length;
  const py = dx / length;

  let d = '';
  for (let i = 0; i <= SKETCH_SEGMENTS; i++) {
    const t = i / SKETCH_SEGMENTS;
    const taper = Math.sin(Math.PI * t);
    const jitter = (hashNoise(seed, i) - 0.5) * 2 * amplitude * taper;
    const x = x1 + dx * t + px * jitter;
    const y = y1 + dy * t + py * jitter;
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}${i < SKETCH_SEGMENTS ? ' ' : ''}`;
  }
  return d;
}

export function GridBoard({
  grid,
  foundWords,
  selectedCells,
  onPointerDown,
  onPointerEnter,
  onPointerUp,
  focus,
  moveFocus,
  toggleSelection,
  cancelSelection,
  hintedCells,
  readOnly = false,
  gridRef,
  shake = false,
}: ReturnType<typeof useGameLogic> & {
  readOnly?: boolean;
  /** The letter grid itself, for callers that need cell geometry (flight start). */
  gridRef?: React.Ref<HTMLDivElement>;
  /** Plays the NeraOS shake once when it turns true (a miss). */
  shake?: boolean;
}) {
  const strokeWidth = 80 / Math.max(grid.width, grid.height);
  const cellIdPrefix = useId().replace(/:/g, '');

  const selectedKeys = useMemo(
    () => new Set(selectedCells.map(c => `${c.x},${c.y}`)),
    [selectedCells]
  );

  /*
   * Every pointer event is hit-tested against the grid's geometry, never
   * against the element under the finger. Traced letters scale up and a found
   * word's letters pop, so a cell's box can overlap its neighbour's; trusting
   * the event target anchored or ended words on the wrong letter.
   */
  const cellAt = (e: React.PointerEvent, el: Element | null) => {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const cellX = Math.floor((e.clientX - rect.left) / (rect.width / grid.width));
    const cellY = Math.floor((e.clientY - rect.top) / (rect.height / grid.height));
    if (cellX < 0 || cellX >= grid.width || cellY < 0 || cellY >= grid.height) return null;
    return grid.cells[cellY][cellX];
  };
  const gridEl = (e: React.PointerEvent) =>
    (e.currentTarget as Element).querySelector('[role="grid"]') ?? (e.currentTarget as Element);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const steps: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      // Jump to the edge of the current row/column. Diagonal words need no
      // special key: the selection is derived from anchor -> cursor, so landing
      // the cursor on the diagonal endpoint is enough.
      Home: [-grid.width, 0],
      End: [grid.width, 0],
      PageUp: [0, -grid.height],
      PageDown: [0, grid.height],
    };

    const step = steps[e.key];
    if (step) {
      e.preventDefault();
      moveFocus(step[0], step[1]);
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleSelection();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      cancelSelection();
    }
  };

  // Calculate SVG loops for found words and current selection
  const loops = useMemo(() => {
    const cellW = 100 / grid.width;
    const cellH = 100 / grid.height;
    const amplitude = Math.min(cellW, cellH) * 0.14;

    const toLoop = (
      id: string,
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      color: string
    ) => {
      const cx1 = (startX + 0.5) * cellW;
      const cy1 = (startY + 0.5) * cellH;
      const cx2 = (endX + 0.5) * cellW;
      const cy2 = (endY + 0.5) * cellH;
      return { id, color, path: sketchPath(cx1, cy1, cx2, cy2, id, amplitude) };
    };

    const list: { id: string; color: string; path: string }[] = [];

    grid.placedWords.forEach((pw, i) => {
      if (foundWords.includes(pw.word)) {
        list.push(toLoop(pw.word, pw.startX, pw.startY, pw.endX, pw.endY, wordColor(i)));
      }
    });

    if (selectedCells.length > 0) {
      const start = selectedCells[0];
      const end = selectedCells[selectedCells.length - 1];
      list.push(toLoop('selection', start.x, start.y, end.x, end.y, 'var(--accent)'));
    }

    return list;
  }, [grid.placedWords, grid.width, grid.height, foundWords, selectedCells]);

  /*
   * Cells under a found capsule, and the newest word's cells in trace order so
   * its letters can pop one after another when it lands.
   */
  const { capsuleKeys, popOrder, popWord } = useMemo(() => {
    const keys = new Set<string>();
    const order = new Map<string, number>();
    const latest = foundWords[foundWords.length - 1];
    grid.placedWords.forEach(pw => {
      if (!foundWords.includes(pw.word)) return;
      const len = pw.word.length;
      const sx = Math.sign(pw.endX - pw.startX);
      const sy = Math.sign(pw.endY - pw.startY);
      for (let i = 0; i < len; i++) {
        const key = `${pw.startX + sx * i},${pw.startY + sy * i}`;
        keys.add(key);
        if (pw.word === latest) order.set(key, i);
      }
    });
    return { capsuleKeys: keys, popOrder: order, popWord: latest ?? '' };
  }, [grid.placedWords, foundWords]);

  return (
    <div
      // The board is a no-fly zone for the butterfly sky (ButterflySky).
      data-no-fly
      className={`washi bg-surface p-2 sm:p-3 border-2 border-line flex flex-col touch-none relative shadow-[4px_5px_0_0_var(--line)] aspect-square grid-board mx-auto ${
        shake ? 'nera-shake' : ''
      }`}
      style={{ borderRadius: '14px 20px 10px 18px' }}
      onPointerUp={readOnly ? undefined : e => onPointerUp(cellAt(e, gridEl(e)))}
      // Leaving the board ends the word where it last was, not at the exit point.
      onPointerLeave={readOnly ? undefined : () => onPointerUp(null)}
      onPointerCancel={readOnly ? undefined : () => onPointerUp(null)}
    >
      <div
        ref={gridRef}
        className="board-paper grid relative z-10 w-full h-full outline-none ring-2 ring-ink/15 focus-visible:ring-4 focus-visible:ring-accent rounded-[10px]"
        style={{
          // Rows MUST be declared alongside columns. Without this, rows fall back
          // to auto (text line-height), so the grid overflowed its own card and
          // every cell centre drifted away from the highlight overlay below.
          gridTemplateColumns: `repeat(${grid.width}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${grid.height}, minmax(0, 1fr))`,
          containerType: 'inline-size',
          ['--cols' as string]: grid.width,
          ['--rows' as string]: grid.height,
        } as CSSProperties}
        // The board is a composite widget: one tab stop, arrow keys move an
        // internal cursor tracked with aria-activedescendant. Before this the
        // grid was pointer-only and completely unplayable without a mouse.
        role="grid"
        tabIndex={readOnly ? -1 : 0}
        aria-label={
          readOnly
            ? `Partner's word search grid, ${grid.width} by ${grid.height}, view only.`
            : `Word search grid, ${grid.width} by ${grid.height}. Arrow keys to move, Enter to start and finish a word, Escape to cancel.`
        }
        aria-readonly={readOnly || undefined}
        aria-rowcount={grid.height}
        aria-colcount={grid.width}
        aria-activedescendant={readOnly ? undefined : `${cellIdPrefix}-${focus.x}-${focus.y}`}
        onKeyDown={readOnly ? undefined : handleKeyDown}
        onPointerDown={
          readOnly
            ? undefined
            : e => {
                if (e.button !== 0) return;
                // Touch implicitly captures to the first element; release it so
                // moves keep reporting while the finger crosses the board.
                (e.target as Element).releasePointerCapture?.(e.pointerId);
                const cell = cellAt(e, e.currentTarget);
                if (cell) onPointerDown(cell);
              }
        }
        onPointerMove={
          readOnly
            ? undefined
            : e => {
                const cell = cellAt(e, e.currentTarget);
                if (cell) onPointerEnter(cell);
              }
        }
      >
        {/* SVG Overlay for Loops */}
        <svg aria-hidden="true" focusable="false" className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1, overflow: 'visible' }} viewBox="0 0 100 100" preserveAspectRatio="none">
          {/*
            The hand-drawn wobble is baked into the path geometry rather than
            produced by an feTurbulence + feDisplacementMap filter. The filter
            ran on two elements per found word and was re-rasterised on every
            animation frame, by far the most expensive thing on the board.
            Geometry costs nothing to composite, and dropping the filter also
            removes the duplicate `id="sketch"` collision in race mode.
          */}
          {loops.map(loop => (
            <g key={loop.id}>
              {/* Inked outline, then the solid capsule: a sticker, not a highlighter. */}
              <motion.path
                d={loop.path}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: loop.id === 'selection' ? 0.08 : 0.22, ease: [0.23, 1, 0.32, 1] }}
                stroke="var(--line)"
                strokeOpacity={0.85}
                strokeWidth={strokeWidth + 1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <motion.path
                d={loop.path}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: loop.id === 'selection' ? 0.08 : 0.22, ease: [0.23, 1, 0.32, 1] }}
                stroke={loop.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </g>
          ))}
        </svg>

        {/*
          role="row" wrappers use `display: contents` so they satisfy the ARIA
          grid structure without inserting a box that would break the CSS grid.
        */}
        {grid.cells.map((row, y) => (
          <div key={y} role="row" aria-rowindex={y + 1} style={{ display: 'contents' }}>
            {row.map(cell => (
              <LetterCell
                // Re-keyed when its word lands, so the letter replays its pop.
                key={popOrder.has(`${cell.x},${cell.y}`) ? `${cell.x}-${popWord}` : cell.x}
                id={`${cellIdPrefix}-${cell.x}-${cell.y}`}
                cell={cell}
                isFocused={focus.x === cell.x && focus.y === cell.y}
                isSelected={selectedKeys.has(`${cell.x},${cell.y}`)}
                onCapsule={capsuleKeys.has(`${cell.x},${cell.y}`)}
                popIndex={popOrder.get(`${cell.x},${cell.y}`)}
                isHinted={hintedCells.has(`${cell.x},${cell.y}`)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
