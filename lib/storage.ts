/**
 * localStorage access that cannot take a page down.
 *
 * Reads were `JSON.parse(localStorage.getItem(k) || '{}')` in a dozen places,
 * so one corrupted value — or storage blocked in a private window — threw
 * during render and blanked whatever page touched it.
 */

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    // Keep the caller's shape: an object where an array is expected (or the
    // reverse) is treated as corrupt.
    if (Array.isArray(fallback) !== Array.isArray(parsed) || parsed === null || typeof parsed !== 'object') {
      return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or quota — progress stays in memory for this visit */
  }
}
