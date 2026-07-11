import { Transition } from 'framer-motion';

export const softBounce: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 20
};

export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95 },
  transition: softBounce
};
