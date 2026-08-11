"use client";
import { useCallback, useEffect, useState } from "react";
import type { VideoItem } from "@/lib/types";

const STORAGE_KEY = "xemphim:watchLater";
// Custom event lets every mounted instance of the hook stay in sync within the
// same tab (the native `storage` event only fires across tabs).
const SYNC_EVENT = "xemphim:watchLater:change";
const MAX_ITEMS = 100;

function read(): VideoItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is VideoItem =>
        typeof v === "object" && v !== null && typeof (v as VideoItem).id === "string",
    );
  } catch {
    return [];
  }
}

function write(items: VideoItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* quota exceeded / storage disabled */
  }
  window.dispatchEvent(new CustomEvent(SYNC_EVENT));
}

/**
 * Watch-later list, persisted in localStorage. The same list doubles as the
 * play queue: `next()` returns the first entry that is not currently playing.
 */
export function useWatchLater() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(read());
    setHydrated(true);

    const sync = () => setItems(read());
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const add = useCallback((item: VideoItem) => {
    const next = [item, ...read().filter((v) => v.id !== item.id)];
    write(next);
    setItems(next);
  }, []);

  const remove = useCallback((id: string) => {
    const next = read().filter((v) => v.id !== id);
    write(next);
    setItems(next);
  }, []);

  const toggle = useCallback((item: VideoItem) => {
    const current = read();
    const next = current.some((v) => v.id === item.id)
      ? current.filter((v) => v.id !== item.id)
      : [item, ...current];
    write(next);
    setItems(next);
  }, []);

  const clear = useCallback(() => {
    write([]);
    setItems([]);
  }, []);

  const has = useCallback(
    (id: string) => items.some((v) => v.id === id),
    [items],
  );

  const next = useCallback(
    (currentId?: string | null) => items.find((v) => v.id !== currentId) ?? null,
    [items],
  );

  return { items, hydrated, add, remove, toggle, clear, has, next };
}
