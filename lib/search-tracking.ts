import { isLocale, type Locale } from "./locale";
import { extractYouTubeId } from "./youtube-url";

export type PopularSearch = { term: string; count: number };
export type PopularSearchSnapshot = {
  items: PopularSearch[];
  loading: boolean;
  error: boolean;
  updatedAt: string | null;
};

const CACHE_TTL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 8_000;
const EMPTY_SNAPSHOT: PopularSearchSnapshot = {
  items: [],
  loading: false,
  error: false,
  updatedAt: null,
};

function keywordForTracking(value: string): string | null {
  if (/[\u0000-\u001f\u007f]/u.test(value)) return null;
  const term = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (
    term.length < 2 ||
    term.length > 200 ||
    !/[\p{L}\p{N}]/u.test(term) ||
    extractYouTubeId(term) !== null ||
    /^(?:[a-z][a-z\d+.-]*:|\/\/|www\.)/iu.test(term) ||
    /^(?:[\p{L}\p{N}-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#]|$)/iu.test(term)
  ) {
    return null;
  }
  return term;
}

type SearchWriteLock = (write: () => Promise<void>) => Promise<void>;

async function withBrowserWriteLock(write: () => Promise<void>): Promise<void> {
  if (typeof globalThis.navigator?.locks?.request === "function") {
    await navigator.locks.request("xemphim:search-visitor-write", write);
  } else {
    await write();
  }
}

/** Bounded, best-effort writes share the first response's visitor cookie. */
export function createSearchRecorder(
  options: {
    fetcher?: typeof fetch;
    withLock?: SearchWriteLock;
    timeoutMs?: number;
  } = {},
) {
  const fetcher = options.fetcher ?? ((...args) => fetch(...args));
  const withLock = options.withLock ?? withBrowserWriteLock;
  let queued = 0;
  let tail = Promise.resolve();

  async function send(body: string): Promise<void> {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new Error("Search recording timed out"));
      }, options.timeoutMs ?? REQUEST_TIMEOUT_MS);
    });
    try {
      // Completing the response lets the browser store its HttpOnly visitor
      // cookie before the next queued search or another tab can record.
      await Promise.race([
        fetcher("/api/searches", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
          signal: controller.signal,
        }),
        deadline,
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Call only for explicit searches; navigation never awaits this queue. */
  function recordSearch(keyword: string, locale: Locale): void {
    const term = keywordForTracking(keyword);
    if (!term || !isLocale(locale) || queued >= 20) return;
    try {
      // An unavailable browser API must never prevent search navigation.
      const eventId = globalThis.crypto?.randomUUID();
      if (!eventId) return;
      const body = JSON.stringify({ keyword: term, locale, eventId });
      queued += 1;
      tail = tail
        .then(() => withLock(() => send(body)))
        .catch(() => {
          // No retries: analytics must neither block search nor inflate counts.
        })
        .finally(() => {
          queued -= 1;
        });
    } catch {
      // Browser restrictions must not interrupt a search.
    }
  }

  return { recordSearch, flush: () => tail };
}

const searchRecorder = createSearchRecorder();
export const recordSearch = searchRecorder.recordSearch;

function parsePopularity(value: unknown): {
  items: PopularSearch[];
  updatedAt: string;
} {
  if (!value || typeof value !== "object") throw new Error("Invalid response");
  const data = value as Record<string, unknown>;
  if (
    data.windowDays !== 7 ||
    typeof data.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(data.updatedAt)) ||
    !Array.isArray(data.items) ||
    data.items.length > 50
  ) {
    throw new Error("Invalid response");
  }
  const items = data.items.map((value: unknown): PopularSearch => {
    if (!value || typeof value !== "object") throw new Error("Invalid keyword");
    const item = value as Record<string, unknown>;
    if (
      typeof item.term !== "string" ||
      !keywordForTracking(item.term) ||
      !Number.isSafeInteger(item.count) ||
      (item.count as number) < 1
    ) {
      throw new Error("Invalid keyword");
    }
    return { term: item.term, count: item.count as number };
  });
  return { items, updatedAt: data.updatedAt };
}

type CacheEntry = {
  snapshot: PopularSearchSnapshot;
  expiresAt: number;
  pending: Promise<void> | null;
  listeners: Set<() => void>;
};

/** A single store shares freshness and in-flight requests across search boxes. */
export function createPopularSearchesStore(
  options: {
    fetcher?: typeof fetch;
    now?: () => number;
    timeoutMs?: number;
  } = {},
) {
  const fetcher = options.fetcher ?? ((...args) => fetch(...args));
  const now = options.now ?? Date.now;
  const entries = new Map<Locale, CacheEntry>();

  function entryFor(locale: Locale): CacheEntry {
    const existing = entries.get(locale);
    if (existing) return existing;
    const entry: CacheEntry = {
      snapshot: EMPTY_SNAPSHOT,
      expiresAt: 0,
      pending: null,
      listeners: new Set(),
    };
    entries.set(locale, entry);
    return entry;
  }

  function publish(entry: CacheEntry, next: PopularSearchSnapshot) {
    entry.snapshot = next;
    for (const listener of entry.listeners) listener();
  }

  function refresh(locale: Locale, force = false): Promise<void> {
    const entry = entryFor(locale);
    if (entry.pending) return entry.pending;
    if (!force && now() < entry.expiresAt) return Promise.resolve();

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? REQUEST_TIMEOUT_MS,
    );
    // Defer work until pending is assigned, even if a fetch implementation
    // throws synchronously or a subscriber immediately asks for a refresh.
    entry.pending = Promise.resolve().then(async () => {
      try {
        const response = await fetcher(
          `/api/searches?locale=${encodeURIComponent(locale)}`,
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("Search popularity unavailable");
        const result = parsePopularity(await response.json());
        publish(entry, { ...result, loading: false, error: false });
      } catch {
        publish(entry, { ...entry.snapshot, loading: false, error: true });
      } finally {
        clearTimeout(timeout);
        // A short-lived failure is shared too, avoiding a request burst when
        // several search surfaces mount. Explicit retry bypasses this TTL.
        entry.expiresAt = now() + CACHE_TTL_MS;
        entry.pending = null;
      }
    });
    publish(entry, { ...entry.snapshot, loading: true, error: false });
    return entry.pending;
  }

  return {
    getSnapshot: (locale: Locale) => entryFor(locale).snapshot,
    getServerSnapshot: () => EMPTY_SNAPSHOT,
    subscribe(locale: Locale, listener: () => void) {
      const entry = entryFor(locale);
      entry.listeners.add(listener);
      return () => {
        entry.listeners.delete(listener);
      };
    },
    refresh,
  };
}

export const popularSearchesStore = createPopularSearchesStore();
