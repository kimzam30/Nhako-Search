
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
    // Earned stars get an ink outline: gold on the light surface is 1.4:1,
    // so a filled star with a gold stroke all but disappeared.
    stroke={filled ? "var(--ink)" : "currentColor"} strokeWidth={filled ? 1.5 : 2} strokeLinejoin="round" strokeLinecap="round"
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
  <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2C12 2 15 6 15 10C15 14.5 12 18 12 18C12 18 9 14.5 9 10C9 6 12 2 12 2Z" />
    <path d="M12 18C15 18 18 15 18 11.5C18 9 16 7 16 7C17 9 16 12 14 13.5C13 14 12 15 12 15" />
    <path d="M12 18C9 18 6 15 6 11.5C6 9 8 7 8 7C7 9 8 12 10 13.5C11 14 12 15 12 15" />
  </svg>
);

export const MapSvg = ({ className = '' }: { className?: string }) => (
  <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 6C4 6 7 4 10 5.5C13 7 15 5 19 4V18C19 18 16 20 13 18.5C10 17 8 19 4 20V6Z" />
    <path d="M10 5.5V18.5" />
    <path d="M13 18.5V5.5" />
  </svg>
);

export const HomeSvg = ({ className = '' }: { className?: string }) => (
  <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 10L11.5 3.5C12 3.2 12.5 3.2 13 3.5L21 10" />
    <path d="M5 12.5V19.5C5 20.2 5.5 20.8 6.2 20.8H9.5V15.5C9.5 14.8 10 14.2 10.8 14.2H13.2C13.9 14.2 14.5 14.8 14.5 15.5V20.8H17.8C18.5 20.8 19 20.2 19 19.5V12.5" />
  </svg>
);

export const RaceSvg = ({ className = '' }: { className?: string }) => (
  <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 15S6 13 10 14S14 16 18 15V4S14 5 10 4S6 6 4 5V15Z" />
    <path d="M4 22V5" />
    <path d="M14 22V16" />
  </svg>
);

export const UserSvg = ({ className = '' }: { className?: string }) => (
  <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 11C14.2 11 16 9.2 16 7C16 4.8 14.2 3 12 3C9.8 3 8 4.8 8 7C8 9.2 9.8 11 12 11Z" />
    <path d="M5.5 21C5.5 17.5 8.2 14.8 12 14.8C15.8 14.8 18.5 17.5 18.5 21" />
  </svg>
);

export const PauseSvg = ({ className = '' }: { className?: string }) => (
  <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 6C8 5.5 7.5 5 7 5C6.5 5 6 5.5 6 6V18C6 18.5 6.5 19 7 19C7.5 19 8 18.5 8 18V6Z" />
    <path d="M18 6C18 5.5 17.5 5 17 5C16.5 5 16 5.5 16 6V18C16 18.5 16.5 19 17 19C17.5 19 18 18.5 18 18V6Z" />
  </svg>
);

export const CloseSvg = ({ className = '' }: { className?: string }) => (
  <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6L6 18" />
    <path d="M6 6L18 18" />
  </svg>
);

export const VolumeSvg = ({ className = '' }: { className?: string }) => (
  <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const iconProps = {
  'aria-hidden': true,
  focusable: false,
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const GearSvg = ({ className = '' }: { className?: string }) => (
  <svg {...iconProps} className={className}>
    <path d="M12 15.2C13.8 15.2 15.2 13.8 15.2 12C15.2 10.2 13.8 8.8 12 8.8C10.2 8.8 8.8 10.2 8.8 12C8.8 13.8 10.2 15.2 12 15.2Z" />
    <path d="M19.4 13.5C19.5 13 19.5 12.5 19.5 12C19.5 11.5 19.5 11 19.4 10.5L21.2 9.1L19.4 5.9L17.3 6.7C16.5 6.1 15.7 5.6 14.8 5.3L14.4 3H10.6L10.2 5.3C9.3 5.6 8.5 6.1 7.7 6.7L5.6 5.9L3.8 9.1L5.6 10.5C5.5 11 5.5 11.5 5.5 12C5.5 12.5 5.5 13 5.6 13.5L3.8 14.9L5.6 18.1L7.7 17.3C8.5 17.9 9.3 18.4 10.2 18.7L10.6 21H14.4L14.8 18.7C15.7 18.4 16.5 17.9 17.3 17.3L19.4 18.1L21.2 14.9L19.4 13.5Z" />
  </svg>
);

export const LockSvg = ({ className = '' }: { className?: string }) => (
  <svg {...iconProps} className={className}>
    <path d="M6 11.2C6 10.5 6.5 10 7.2 10H16.8C17.5 10 18 10.5 18 11.2V19C18 19.7 17.5 20.2 16.8 20.2H7.2C6.5 20.2 6 19.7 6 19V11.2Z" />
    <path d="M8.5 10V7.2C8.5 5.2 10 3.8 12 3.8C14 3.8 15.5 5.2 15.5 7.2V10" />
  </svg>
);

export const ShareSvg = ({ className = '' }: { className?: string }) => (
  <svg {...iconProps} className={className}>
    <path d="M12 3.5V14.5" />
    <path d="M8 7.2L12 3.5L16 7.2" />
    <path d="M7 10.5H6C5.4 10.5 5 11 5 11.5V19.5C5 20.1 5.4 20.5 6 20.5H18C18.6 20.5 19 20.1 19 19.5V11.5C19 11 18.6 10.5 18 10.5H17" />
  </svg>
);

export const ChevronRightSvg = ({ className = '' }: { className?: string }) => (
  <svg {...iconProps} className={className}>
    <path d="M9.5 5.5L15.5 12L9.5 18.5" />
  </svg>
);

export const PlaySvg = ({ className = '' }: { className?: string }) => (
  <svg {...iconProps} className={className}>
    <path d="M7.5 5.2C7.5 4.4 8.4 3.9 9.1 4.4L18.4 11.2C19 11.6 19 12.4 18.4 12.8L9.1 19.6C8.4 20.1 7.5 19.6 7.5 18.8V5.2Z" />
  </svg>
);

export const MusicSvg = ({ className = '' }: { className?: string }) => (
  <svg {...iconProps} className={className}>
    <path d="M9 18V6L20 4V16" />
    <path d="M6 21C7.7 21 9 19.9 9 18.5C9 17.1 7.7 16 6 16C4.3 16 3 17.1 3 18.5C3 19.9 4.3 21 6 21Z" />
    <path d="M17 19C18.7 19 20 17.9 20 16.5C20 15.1 18.7 14 17 14C15.3 14 14 15.1 14 16.5C14 17.9 15.3 19 17 19Z" />
  </svg>
);

export const WandSvg = ({ className = '' }: { className?: string }) => (
  <svg {...iconProps} className={className}>
    <path d="M4.5 19.8L14.2 10.1" />
    <path d="M13.2 9.1L15.1 7.3C15.6 6.8 16.4 6.8 16.8 7.3L16.9 7.4C17.3 7.8 17.3 8.5 16.9 9L15 10.9" />
    <path d="M18.5 2.8L19 4.6L20.8 5.1L19 5.6L18.5 7.4L18 5.6L16.2 5.1L18 4.6Z" />
    <path d="M9 3.5L9.4 4.8L10.6 5.2L9.4 5.6L9 6.9L8.6 5.6L7.4 5.2L8.6 4.8Z" />
    <path d="M20.2 12.5L20.5 13.4L21.4 13.7L20.5 14L20.2 14.9L19.9 14L19 13.7L19.9 13.4Z" />
  </svg>
);

export const ClockSvg = ({ className = '' }: { className?: string }) => (
  <svg {...iconProps} className={className}>
    <path d="M12 21.2C17.1 21.3 21.2 17.1 21.1 12C21 6.9 17 3 12 2.9C6.9 2.8 2.9 6.9 2.9 12C2.9 17.1 6.9 21.1 12 21.2Z" />
    <path d="M12 7.2V12.2L15.2 14.1" />
  </svg>
);

export const CheckSvg = ({ className = '' }: { className?: string }) => (
  <svg {...iconProps} className={className}>
    <path d="M4.5 12.8L9.3 17.4C9.6 17.7 10.1 17.7 10.4 17.4L19.8 6.8" />
  </svg>
);
