"use client";
import { useCallback, useEffect, useState } from "react";
import {
  createClientId,
  guestDisplayName,
  sanitizeDisplayName,
} from "@/lib/rooms";

const NAME_KEY = "xemphim:room:name";

/**
 * Identity used inside rooms.
 *
 * Guests can watch, so membership cannot key off a user id. Instead each
 * mounted room keeps its own `clientId`, which also lets a client recognise its
 * own playback actions when they come back through polling.
 */
export function useRoomIdentity(preferredName?: string | null) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Independent tabs must not mistake each other's actions for their own echo.
    setClientId((previous) => previous ?? createClientId());
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(NAME_KEY); } catch { /* Private mode. */ }
    setName(
      sanitizeDisplayName(stored || preferredName || "") || guestDisplayName(),
    );
    setHydrated(true);
  }, [preferredName]);

  const rename = useCallback((value: string) => {
    setName(value);
  }, []);

  const persistName = useCallback((value: string) => {
    const clean = sanitizeDisplayName(value) || guestDisplayName();
    try { window.localStorage.setItem(NAME_KEY, clean); } catch { /* Private mode. */ }
    setName(clean);
    return clean;
  }, []);

  return { clientId, name, hydrated, rename, persistName };
}
