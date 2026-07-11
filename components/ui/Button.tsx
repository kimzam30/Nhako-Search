import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { softBounce } from '../motion/springs';

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}: ButtonProps) {
  
  const baseClasses = "relative font-display font-bold text-lg px-6 py-3 border-2 border-ink flex items-center justify-center transition-colors";
  const radiusClass = "rounded-tl-[18px] rounded-tr-[12px] rounded-br-[16px] rounded-bl-[10px]";
  const widthClass = fullWidth ? "w-full" : "";
  
  let colorClasses = "";
  if (variant === 'primary') {
    colorClasses = "bg-accent text-ink hover:bg-accent-soft";
  } else if (variant === 'secondary') {
    colorClasses = "bg-surface text-ink hover:bg-white";
  } else if (variant === 'danger') {
    colorClasses = "bg-rose-400 text-ink hover:bg-rose-300";
  }

  return (
    <motion.button
      whileTap={{ 
        y: 5, 
        x: 4, 
        boxShadow: "0px 0px 0 0 var(--ink)",
        scale: 0.98
      }}
      transition={softBounce}
      className={`${baseClasses} ${radiusClass} ${widthClass} ${colorClasses} ${className}`}
      style={{
        boxShadow: "4px 5px 0 0 var(--ink)",
        ...props.style
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
