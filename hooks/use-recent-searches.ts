"use client";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "xemphim:recentSearches";
const MAX_ITEMS = 8;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.length > 0);
  } catch {
    return [];
  }
}

function write(items: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* ignore */
  }
}

/** Recently used search terms, most recent first. */
export function useRecentSearches() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    setItems(read());
  }, []);

  const add = useCallback((term: string) => {
    const value = term.trim();
    if (value.length < 2) return;
    // Case-insensitive de-dupe, but keep the casing the user just typed.
    const next = [
      value,
      ...read().filter((v) => v.toLowerCase() !== value.toLowerCase()),
    ].slice(0, MAX_ITEMS);
    write(next);
    setItems(next);
  }, []);

  const remove = useCallback((term: string) => {
    const next = read().filter((v) => v !== term);
    write(next);
    setItems(next);
  }, []);

  const clear = useCallback(() => {
    write([]);
    setItems([]);
  }, []);

  return { items, add, remove, clear };
}
