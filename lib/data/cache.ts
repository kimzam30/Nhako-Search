import { useCallback, useEffect, useSyncExternalStore } from 'react';

/*
 * A small stale-while-revalidate cache for player data.
 *
 * Before this, every screen fetched its own data in a mount effect, so each
 * tab switch started from an empty screen and waited on a chain of queries
 * (measured live: 370-600 ms before anything useful appeared, every time).
 * Now a screen renders the cached value on the same frame it mounts and
 * refreshes in the background; the first visit of a session is served from
 * localStorage, so even a cold start paints real numbers.
 *
 * Deliberately tiny rather than a dependency: one kind of data, one scope.
 */

interface Entry<T> {
  data?: T;
  error?: unknown;
  updatedAt: number;
  inflight?: Promise<T>;
}

const entries = new Map<string, Entry<unknown>>();
const listeners = new Map<string, Set<() => void>>();
const PERSIST_PREFIX = 'nhako_cache:';
/** Older than this, a cached value is shown but refreshed behind it. */
const STALE_MS = 20_000;

function notify(key: string) {
  listeners.get(key)?.forEach(l => l());
}

function entry<T>(key: string, persist: boolean): Entry<T> {
  let e = entries.get(key) as Entry<T> | undefined;
  if (!e) {
    e = { updatedAt: 0 };
    if (persist && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(PERSIST_PREFIX + key);
        if (raw) {
          const parsed = JSON.parse(raw) as { data: T; at: number };
          // Persisted values paint instantly but always count as stale.
          e.data = parsed.data;
          e.updatedAt = 0;
        }
      } catch {
        /* corrupt or blocked storage: fetch fresh */
      }
    }
    entries.set(key, e as Entry<unknown>);
  }
  return e;
}

function save(key: string, data: unknown) {
  try {
    localStorage.setItem(PERSIST_PREFIX + key, JSON.stringify({ data, at: Date.now() }));
  } catch {
    /* quota or private mode */
  }
}

/** Fetches (deduplicated) and stores the result. Never throws. */
export function fetchInto<T>(key: string, fetcher: () => Promise<T>, persist = false): Promise<T | undefined> {
  const e = entry<T>(key, persist);
  if (e.inflight) return e.inflight.catch(() => undefined);
  const p = fetcher();
  e.inflight = p;
  notify(key);
  return p
    .then(data => {
      e.data = data;
      e.error = undefined;
      e.updatedAt = Date.now();
      if (persist) save(key, data);
      return data;
    })
    .catch(err => {
      e.error = err;
      console.error(`[cache] ${key} failed`, err);
      return undefined;
    })
    .finally(() => {
      e.inflight = undefined;
      notify(key);
    });
}

/** Warm the cache ahead of navigation (e.g. on tab press-in). */
export function prefetch<T>(key: string, fetcher: () => Promise<T>, persist = false) {
  const e = entry<T>(key, persist);
  if (!e.inflight && Date.now() - e.updatedAt > STALE_MS) void fetchInto(key, fetcher, persist);
}

/** Marks keys starting with `prefix` stale and refetches any being watched. */
export function invalidate(prefix: string) {
  for (const [key, e] of entries) {
    if (key.startsWith(prefix)) {
      e.updatedAt = 0;
      notify(key);
    }
  }
}

/** Local write: update a cached value immediately (optimistic UI). */
export function mutate<T>(key: string, update: (prev: T | undefined) => T | undefined, persist = false) {
  const e = entry<T>(key, persist);
  e.data = update(e.data);
  if (persist && e.data !== undefined) save(key, e.data);
  notify(key);
}

export function readCache<T>(key: string): T | undefined {
  return entries.get(key)?.data as T | undefined;
}

/** Drops every persisted entry (sign-out, Delete My Data). */
export function clearCache() {
  entries.clear();
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PERSIST_PREFIX)) doomed.push(k);
    }
    doomed.forEach(k => localStorage.removeItem(k));
  } catch {
    /* private mode */
  }
  listeners.forEach((_, key) => notify(key));
}

interface QueryResult<T> {
  data: T | undefined;
  error: unknown;
  /** True only when there is nothing at all to show yet. */
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<T | undefined>;
}

/**
 * Subscribes to a cached query. `key` null means "not ready yet" (e.g. the
 * session is still being read): nothing is fetched and nothing is shown.
 */
export function useQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  { persist = false }: { persist?: boolean } = {}
): QueryResult<T> {
  const subscribe = useCallback(
    (l: () => void) => {
      if (!key) return () => {};
      let set = listeners.get(key);
      if (!set) listeners.set(key, (set = new Set()));
      set.add(l);
      return () => set!.delete(l);
    },
    [key]
  );
  // Snapshot is the entry object's fields; a version counter keeps it stable.
  const snap = useSyncExternalStore(
    subscribe,
    () => (key ? snapshotOf(entry<T>(key, persist)) : EMPTY_SNAP),
    () => EMPTY_SNAP
  ) as Snapshot<T>;

  useEffect(() => {
    if (!key) return;
    const e = entry<T>(key, persist);
    if (!e.inflight && Date.now() - e.updatedAt > STALE_MS) void fetchInto(key, fetcher, persist);
    // `fetcher` is intentionally not a dependency: callers pass inline lambdas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, persist, snap.updatedAt]);

  // Refresh when the player comes back to the tab.
  useEffect(() => {
    if (!key) return;
    const onFocus = () => {
      if (document.visibilityState === 'visible') prefetch(key, fetcher, persist);
    };
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, persist]);

  const refresh = useCallback(
    () => (key ? fetchInto(key, fetcher, persist) : Promise.resolve(undefined)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, persist]
  );

  return {
    data: snap.data,
    error: snap.error,
    isLoading: snap.data === undefined && !snap.error,
    isRefreshing: snap.inflight,
    refresh,
  };
}

interface Snapshot<T> {
  data: T | undefined;
  error: unknown;
  updatedAt: number;
  inflight: boolean;
}
const EMPTY_SNAP: Snapshot<unknown> = { data: undefined, error: undefined, updatedAt: 0, inflight: false };
const snapCache = new WeakMap<Entry<unknown>, Snapshot<unknown>>();

function snapshotOf<T>(e: Entry<T>): Snapshot<T> {
  const prev = snapCache.get(e as Entry<unknown>) as Snapshot<T> | undefined;
  const inflight = !!e.inflight;
  if (prev && prev.data === e.data && prev.error === e.error && prev.updatedAt === e.updatedAt && prev.inflight === inflight) {
    return prev;
  }
  const next = { data: e.data, error: e.error, updatedAt: e.updatedAt, inflight };
  snapCache.set(e as Entry<unknown>, next as Snapshot<unknown>);
  return next;
}
