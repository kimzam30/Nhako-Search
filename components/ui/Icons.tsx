import React from 'react';

export const ButterflySvg = ({ className = '' }: { className?: string }) => (
  <svg 
    width="24" height="24" viewBox="0 0 24 24" 
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 12C9 6 3 7 4 13C4.5 16 8 18 12 12Z" />
    <path d="M12 12C15 6 21 7 20 13C19.5 16 16 18 12 12Z" />
    <path d="M12 4C11.5 6 11.8 9 12 12C12.2 9 12.5 6 12 4Z" fill="none" />
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
    <path d="M11.8 2.2C12.1 4.5 13.5 7.2 15.3 8.1C18 9.5 21.8 9.1 21.8 9.1C21.8 9.1 18.5 12 17.2 14.5C16.3 16.3 17.5 20.8 17.5 20.8C17.5 20.8 14 18 11.8 17.5C9 16.9 6.2 20.5 6.2 20.5C6.2 20.5 7.5 16.2 6.5 14.2C5.1 11.5 2.2 9.4 2.2 9.4C2.2 9.4 6 9.5 8.2 8.3C10.2 7.2 11.2 4 11.8 2.2Z" />
  </svg>
);

export const ChatSvg = ({ className = '' }: { className?: string }) => (
  <svg 
    width="24" height="24" viewBox="0 0 24 24" 
    fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M20.5 14.5C21.2 12.8 21.5 10.5 20.2 8.2C18.2 4.5 12.5 3.8 8.2 5.5C4.2 7.1 2.5 11.8 4.2 15.5C5.2 17.8 7.8 19.5 10.5 19.8C11.5 19.9 12.2 20.5 12.5 21.5L13.2 23.5L15.8 20.2C16.2 19.5 17.5 19.2 18.5 18.5C19.8 17.5 20.2 15.8 20.5 14.5Z" />
  </svg>
);

export const FlameSvg = ({ className = '' }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2C12 2 15 6 15 10C15 14.5 12 18 12 18C12 18 9 14.5 9 10C9 6 12 2 12 2Z" />
    <path d="M12 18C15 18 18 15 18 11.5C18 9 16 7 16 7C17 9 16 12 14 13.5C13 14 12 15 12 15" />
    <path d="M12 18C9 18 6 15 6 11.5C6 9 8 7 8 7C7 9 8 12 10 13.5C11 14 12 15 12 15" />
  </svg>
);

export const MapSvg = ({ className = '' }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 6C4 6 7 4 10 5.5C13 7 15 5 19 4V18C19 18 16 20 13 18.5C10 17 8 19 4 20V6Z" />
    <path d="M10 5.5V18.5" />
    <path d="M13 18.5V5.5" />
  </svg>
);

export const HomeSvg = ({ className = '' }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 10L11.5 3.5C12 3.2 12.5 3.2 13 3.5L21 10" />
    <path d="M5 12.5V19.5C5 20.2 5.5 20.8 6.2 20.8H9.5V15.5C9.5 14.8 10 14.2 10.8 14.2H13.2C13.9 14.2 14.5 14.8 14.5 15.5V20.8H17.8C18.5 20.8 19 20.2 19 19.5V12.5" />
  </svg>
);

export const RaceSvg = ({ className = '' }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 15S6 13 10 14S14 16 18 15V4S14 5 10 4S6 6 4 5V15Z" />
    <path d="M4 22V5" />
    <path d="M14 22V16" />
  </svg>
);

export const UserSvg = ({ className = '' }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 11C14.2 11 16 9.2 16 7C16 4.8 14.2 3 12 3C9.8 3 8 4.8 8 7C8 9.2 9.8 11 12 11Z" />
    <path d="M5.5 21C5.5 17.5 8.2 14.8 12 14.8C15.8 14.8 18.5 17.5 18.5 21" />
  </svg>
);

export const PauseSvg = ({ className = '' }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 6C8 5.5 7.5 5 7 5C6.5 5 6 5.5 6 6V18C6 18.5 6.5 19 7 19C7.5 19 8 18.5 8 18V6Z" />
    <path d="M18 6C18 5.5 17.5 5 17 5C16.5 5 16 5.5 16 6V18C16 18.5 16.5 19 17 19C17.5 19 18 18.5 18 18V6Z" />
  </svg>
);

export const CloseSvg = ({ className = '' }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6L6 18" />
    <path d="M6 6L18 18" />
  </svg>
);
