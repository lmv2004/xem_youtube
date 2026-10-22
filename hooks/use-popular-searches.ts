"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { Locale } from "@/lib/locale";
import { popularSearchesStore } from "@/lib/search-tracking";

export type {
  PopularSearch,
  PopularSearchSnapshot,
} from "@/lib/search-tracking";

/** Fetch once per locale/minute, independent of what the user is typing. */
export function usePopularSearches(locale: Locale, enabled = true) {
  const subscribe = useCallback(
    (listener: () => void) =>
      enabled ? popularSearchesStore.subscribe(locale, listener) : () => {},
    [enabled, locale],
  );
  const getSnapshot = useCallback(
    () => popularSearchesStore.getSnapshot(locale),
    [locale],
  );
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    popularSearchesStore.getServerSnapshot,
  );

  useEffect(() => {
    if (!enabled) return;
    void popularSearchesStore.refresh(locale);
    const onForeground = () => {
      if (document.visibilityState === "visible") {
        void popularSearchesStore.refresh(locale);
      }
    };
    document.addEventListener("visibilitychange", onForeground);
    window.addEventListener("focus", onForeground);
    return () => {
      document.removeEventListener("visibilitychange", onForeground);
      window.removeEventListener("focus", onForeground);
    };
  }, [enabled, locale]);

  const refresh = useCallback(
    () => popularSearchesStore.refresh(locale, true),
    [locale],
  );
  return { ...snapshot, refresh };
}
