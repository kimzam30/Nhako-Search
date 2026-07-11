import React from 'react';

export const ButterflySvg = ({ className = '' }: { className?: string }) => (
  <svg 
    width="24" height="24" viewBox="0 0 24 24" 
    fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* // TODO: replace with final SVG per design.md */}
    <path d="M12 12C10 6 4 6 4 12C4 18 10 18 12 12ZM12 12C14 6 20 6 20 12C20 18 14 18 12 12Z" />
    <path d="M12 4V12" fill="none" />
  </svg>
);

export const StarSvg = ({ className = '', filled = true }: { className?: string, filled?: boolean }) => (
  <svg 
    width="16" height="16" viewBox="0 0 24 24" 
    fill={filled ? "currentColor" : "none"} 
    stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
    className={className}
    aria-hidden="true"
  >
    {/* // TODO: replace with final SVG per design.md */}
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const ChatSvg = ({ className = '' }: { className?: string }) => (
  <svg 
    width="24" height="24" viewBox="0 0 24 24" 
    fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* // TODO: replace with final SVG per design.md */}
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
