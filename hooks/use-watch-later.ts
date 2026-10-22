"use client";
import { useCallback, useEffect, useState } from "react";
import type { VideoItem } from "@/lib/types";
import { moveWatchLater, normalizeWatchLater } from "@/lib/local-library";

const STORAGE_KEY = "xemphim:watchLater";
const SYNC_EVENT = "xemphim:watchLater:change";
let memoryItems: VideoItem[] = [];
let hasUnpersistedChanges = false;

function read(): VideoItem[] {
  if (typeof window === "undefined") return [];
  if (hasUnpersistedChanges) return memoryItems;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    memoryItems = normalizeWatchLater(raw ? JSON.parse(raw) : []);
  } catch {
    // Keep this session usable when browser storage is unavailable.
  }
  return memoryItems;
}

function write(items: VideoItem[]) {
  memoryItems = normalizeWatchLater(items);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryItems));
    hasUnpersistedChanges = false;
  } catch {
    // In storage-restricted browsers the list lasts for this session.
    hasUnpersistedChanges = true;
  }
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: memoryItems }));
  return memoryItems;
}

/** Shared local library, compatible with existing stored lists. */
export function useWatchLater() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(read());
    setHydrated(true);
    const sync = (event: Event) =>
      setItems((event as CustomEvent<VideoItem[]>).detail);
    const storage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) setItems(read());
    };
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener("storage", storage);
    };
  }, []);

  const add = useCallback((item: VideoItem) => {
    setItems(write([item, ...read().filter((video) => video.id !== item.id)]));
  }, []);
  const remove = useCallback((id: string) => {
    setItems(write(read().filter((video) => video.id !== id)));
  }, []);
  const toggle = useCallback((item: VideoItem) => {
    const current = read();
    setItems(
      write(
        current.some((video) => video.id === item.id)
          ? current.filter((video) => video.id !== item.id)
          : [item, ...current],
      ),
    );
  }, []);
  const clear = useCallback(() => setItems(write([])), []);
  const move = useCallback((id: string, direction: -1 | 1) => {
    setItems(write(moveWatchLater(read(), id, direction)));
  }, []);
  const has = useCallback(
    (id: string) => items.some((video) => video.id === id),
    [items],
  );
  const next = useCallback(
    (currentId?: string | null) =>
      items.find((video) => video.id !== currentId) ?? null,
    [items],
  );

  return { items, hydrated, add, remove, toggle, clear, move, has, next };
}
