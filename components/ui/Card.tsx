import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  noShadow?: boolean;
}

export function Card({ children, className = '', noShadow = false, ...props }: CardProps) {
  const shadowStyle = noShadow ? {} : { boxShadow: "4px 5px 0 0 var(--line)" };
  
  return (
    <div 
      className={`bg-surface border-2 border-line p-6 rounded-tl-[16px] rounded-tr-[24px] rounded-br-[18px] rounded-bl-[22px] ${className}`}
      style={{ ...shadowStyle, ...props.style }}
      {...props}
    >
      {children}
    </div>
  );
}
