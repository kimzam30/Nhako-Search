'use client';

import { useGameLogic } from '@/lib/puzzle/useGameLogic';
import { LetterCell } from './LetterCell';
import { useMemo } from 'react';
import { motion } from 'framer-motion';

export function GridBoard({ grid, foundWords, selectedCells, onPointerDown, onPointerEnter, onPointerUp }: ReturnType<typeof useGameLogic>) {
  
  // Calculate SVG loops for found words and current selection
  const loops = useMemo(() => {
    const list: any[] = [];
    
    // Found words
    grid.placedWords.forEach(pw => {
      if (foundWords.includes(pw.word)) {
        list.push({
          id: pw.word,
          startX: pw.startX,
          startY: pw.startY,
          endX: pw.endX,
          endY: pw.endY,
          isFound: true
        });
      }
    });

    // Current selection
    if (selectedCells.length > 0) {
      const start = selectedCells[0];
      const end = selectedCells[selectedCells.length - 1];
      list.push({
        id: 'selection',
        startX: start.x,
        startY: start.y,
        endX: end.x,
        endY: end.y,
        isFound: false
      });
    }
    
    return list;
  }, [grid.placedWords, foundWords, selectedCells]);

  return (
    <div 
      className="bg-surface p-2 sm:p-4 border-2 border-ink flex flex-col touch-none relative shadow-[4px_5px_0_0_var(--ink)] aspect-square w-full max-w-[450px] mx-auto"
      style={{ borderRadius: '12px 18px 8px 16px' }}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div 
        className="grid relative z-10 w-full h-full" 
        style={{ gridTemplateColumns: `repeat(${grid.width}, minmax(0, 1fr))` }}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width * 100;
          const y = (e.clientY - rect.top) / rect.height * 100;
          const cellX = Math.floor(x / (100 / grid.width));
          const cellY = Math.floor(y / (100 / grid.height));
          if (cellX >= 0 && cellX < grid.width && cellY >= 0 && cellY < grid.height) {
            onPointerEnter(grid.cells[cellY][cellX]);
          }
        }}
      >
        {/* SVG Overlay for Loops */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1, overflow: 'visible' }} viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* We use standard turbulence filter for sketchy look */}
          <filter id="sketch" filterUnits="userSpaceOnUse" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          {loops.map(loop => {
            // Centers of the cells
            const cx1 = (loop.startX + 0.5) * (100 / grid.width);
            const cy1 = (loop.startY + 0.5) * (100 / grid.height);
            const cx2 = (loop.endX + 0.5) * (100 / grid.width);
            const cy2 = (loop.endY + 0.5) * (100 / grid.height);
            
            return (
              <motion.line 
                key={loop.id}
                initial={{ pathLength: 0, opacity: 0, x1: cx1, y1: cy1, x2: cx1, y2: cy1 }}
                animate={{ pathLength: 1, opacity: 1, x1: cx1, y1: cy1, x2: cx2, y2: cy2 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                stroke={loop.isFound ? 'var(--found)' : 'var(--accent)'}
                strokeWidth={80 / Math.max(grid.width, grid.height)}
                strokeLinecap="round"
                className="opacity-40"
                filter="url(#sketch)"
              />
            );
          })}
          {loops.map(loop => {
             // Draw outline
             const cx1 = (loop.startX + 0.5) * (100 / grid.width);
             const cy1 = (loop.startY + 0.5) * (100 / grid.height);
             const cx2 = (loop.endX + 0.5) * (100 / grid.width);
             const cy2 = (loop.endY + 0.5) * (100 / grid.height);
             
             return (
               <motion.line 
                 key={loop.id + '-outline'}
                 initial={{ pathLength: 0, opacity: 0, x1: cx1, y1: cy1, x2: cx1, y2: cy1 }}
                 animate={{ pathLength: 1, opacity: 1, x1: cx1, y1: cy1, x2: cx2, y2: cy2 }}
                 transition={{ duration: 0.15, ease: "easeOut" }}
                 stroke="var(--ink)"
                 strokeWidth={80 / Math.max(grid.width, grid.height) + 2}
                 strokeLinecap="round"
                 fill="none"
                 className="opacity-20"
                 filter="url(#sketch)"
                 style={{ mixBlendMode: 'multiply' }}
               />
             );
          })}
        </svg>

        {grid.cells.flat().map((cell, idx) => {
          return (
            <LetterCell 
              key={idx}
              cell={cell}
              onPointerDown={onPointerDown}
              onPointerEnter={onPointerEnter}
            />
          );
        })}
      </div>
    </div>
  );
}
