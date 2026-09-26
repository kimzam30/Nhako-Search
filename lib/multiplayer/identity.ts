/**
 * Room codes and guest identity.
 *
 * Codes avoid characters that are easy to misread aloud or mistype (O/0, I/1,
 * S/5, B/8), which matters because the whole point is reading the code to
 * someone else.
 */
export const ROOM_CODE_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXYZ2346789';
export const ROOM_CODE_LENGTH = 6;

function randomInts(count: number): Uint32Array {
  const out = new Uint32Array(count);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < count; i++) out[i] = Math.floor(Math.random() * 0xffffffff);
  return out;
}

/**
 * Previously `Math.random().toString(36).substring(2, 6)`, which returns fewer
 * than 4 characters whenever the float's base-36 expansion is short, creating
 * a room nobody could join, because the join form required exactly 4.
 */
export function generateRoomCode(): string {
  const values = randomInts(ROOM_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[values[i] % ROOM_CODE_ALPHABET.length];
  }
  return code;
}

export function normaliseRoomCode(input: string): string {
  return input
    .toUpperCase()
    .split('')
    .filter(c => ROOM_CODE_ALPHABET.includes(c))
    .join('')
    .slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(code: string): boolean {
  return code.length === ROOM_CODE_LENGTH && [...code].every(c => ROOM_CODE_ALPHABET.includes(c));
}

const GUEST_ID_KEY = 'nhako_guest_id';

/**
 * A guest id that survives a page reload, so refreshing mid-race rejoins the
 * room rather than appearing as a second, unknown player. sessionStorage (not
 * localStorage) keeps two tabs on one device distinct, which also lets both
 * sides of a race be tested from a single browser.
 */
export function getStableGuestId(): string {
  if (typeof window === 'undefined') return 'guest-ssr';
  let id = sessionStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = 'guest-' + generateRoomCode().toLowerCase() + Date.now().toString(36).slice(-4);
    sessionStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}
