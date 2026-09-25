/**
 * Route classification shared by the navigation chrome.
 *
 * Gameplay screens are immersive, like a native game: no tab bar, just a top
 * bar with Close and Sound. Leaving one mid-puzzle loses the attempt, so Close
 * asks first.
 */
export function gameplayParent(pathname: string | null): string | null {
  if (!pathname) return null;
  if (pathname === '/daily/play') return '/daily';
  if (/^\/level-path\/[^/]+$/.test(pathname)) return '/level-path';
  if (/^\/play\/standard\/.+/.test(pathname)) return '/play/standard';
  if (/^\/play\/race\/[^/]+$/.test(pathname) && pathname !== '/play/race/lobby') return '/play/race/lobby';
  return null;
}

export function isGameplayRoute(pathname: string | null): boolean {
  return gameplayParent(pathname) !== null;
}

/** Screens with no navigation chrome at all. */
export function isChromeless(pathname: string | null): boolean {
  return pathname === '/sign-in';
}
