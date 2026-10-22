"use client";
import { useCallback, useEffect, useState } from "react";
import { normalizeRecentSearches } from "@/lib/local-library";

const STORAGE_KEY = "xemphim:recentSearches";
const SYNC_EVENT = "xemphim:recentSearches:change";
let memoryItems: string[] = [];
let hasUnpersistedChanges = false;

function read(): string[] {
  if (typeof window === "undefined") return [];
  if (hasUnpersistedChanges) return memoryItems;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    memoryItems = normalizeRecentSearches(raw ? JSON.parse(raw) : []);
  } catch {
    /* Storage restrictions must not break search. */
  }
  return memoryItems;
}

function write(items: string[]) {
  memoryItems = normalizeRecentSearches(items);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryItems));
    hasUnpersistedChanges = false;
  } catch {
    hasUnpersistedChanges = true;
  }
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: memoryItems }));
  return memoryItems;
}

export function useRecentSearches() {
  const [items, setItems] = useState<string[]>([]);
  useEffect(() => {
    setItems(read());
    const sync = (event: Event) =>
      setItems((event as CustomEvent<string[]>).detail);
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
  const add = useCallback((term: string) => {
    if (term.trim().length < 2) return;
    setItems(write([term, ...read()]));
  }, []);
  const remove = useCallback(
    (term: string) => setItems(write(read().filter((value) => value !== term))),
    [],
  );
  const clear = useCallback(() => setItems(write([])), []);
  return { items, add, remove, clear };
}
