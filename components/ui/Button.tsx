import Link from 'next/link';
import { motion, HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

/*
 * The sticker button. Pressing it pushes the sticker into its own shadow
 * (the brand's press state) on press-IN, in 100ms, with no spring overshoot:
 * a bouncy release read as lag on a phone.
 */
const PRESS = { duration: 0.1, ease: [0.23, 1, 0.32, 1] as const };

export function Button({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const baseClasses =
    "relative font-display font-bold text-lg px-6 py-3 min-h-[48px] border-2 border-line flex items-center justify-center gap-2 transition-colors duration-150 touch-manipulation select-none disabled:cursor-not-allowed disabled:opacity-50";
  const radiusClass = "rounded-tl-[18px] rounded-tr-[12px] rounded-br-[16px] rounded-bl-[10px]";
  const widthClass = fullWidth ? "w-full" : "";

  // Text on accent/danger fills uses --on-accent: the ink token turns
  // near-white in dark mode, which left 1.83:1 text on every primary button.
  const colorClasses =
    variant === 'primary'
      ? 'bg-accent text-on-accent [@media(hover:hover)]:hover:brightness-105'
      : variant === 'danger'
        ? 'bg-danger text-on-accent [@media(hover:hover)]:hover:brightness-105'
        : 'bg-surface text-ink [@media(hover:hover)]:hover:bg-accent-soft';

  return (
    <motion.button
      // Hover is mouse-only in Motion, so touch never gets a stuck lift.
      whileHover={disabled ? undefined : { y: -2, x: -1, boxShadow: '5px 7px 0 0 var(--line)' }}
      whileTap={disabled ? undefined : { y: 4, x: 3, boxShadow: '0px 0px 0 0 var(--line)' }}
      transition={PRESS}
      disabled={disabled}
      className={`${baseClasses} ${radiusClass} ${widthClass} ${colorClasses} ${className}`}
      {...props}
      // Merged after the spread: a caller's `style` used to replace this
      // object outright and take the sticker shadow with it.
      style={{
        boxShadow: disabled ? '2px 2px 0 0 var(--line)' : '4px 5px 0 0 var(--line)',
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
}

interface ButtonLinkProps extends React.ComponentProps<typeof Link> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

/**
 * A link that looks like a Button. Wrapping <Button> in <Link> nested a
 * button inside an anchor: invalid HTML that screen readers announce twice.
 */
export function ButtonLink({ variant = 'primary', fullWidth = false, className = '', ...props }: ButtonLinkProps) {
  const colorClasses =
    variant === 'primary'
      ? 'bg-accent text-on-accent [@media(hover:hover)]:hover:brightness-105'
      : variant === 'danger'
        ? 'bg-danger text-on-accent'
        : 'bg-surface text-ink [@media(hover:hover)]:hover:bg-accent-soft';
  return (
    <Link
      className={`sticker relative font-display font-bold text-lg px-6 py-3 min-h-[48px] border-2 border-line flex items-center justify-center gap-2 text-center rounded-tl-[18px] rounded-tr-[12px] rounded-br-[16px] rounded-bl-[10px] touch-manipulation ${fullWidth ? 'w-full' : ''} ${colorClasses} ${className}`}
      {...props}
    />
  );
}
