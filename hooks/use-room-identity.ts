"use client";
import { useCallback, useEffect, useState } from "react";
import {
  createClientId,
  guestDisplayName,
  sanitizeDisplayName,
} from "@/lib/rooms";

const NAME_KEY = "xemphim:room:nickname:v2";
const TAB_CLIENT_KEY = "xemphim:room:tab_client_id:v1";

/**
 * Identity used inside rooms.
 *
 * Guests can watch, so membership cannot key off a user id. Instead each
 * mounted room keeps its own `clientId`, which also lets a client recognise its
 * own playback actions when they come back through polling.
 */
export function useRoomIdentity(code: string) {
  const roomNameKey = `${NAME_KEY}:${code}`;
  const [clientId, setClientId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const tabId = createClientId();
    try { window.sessionStorage.setItem(TAB_CLIENT_KEY, tabId); } catch { /* Optional storage. */ }
    setClientId(previous => previous ?? tabId);

    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(roomNameKey) ?? window.localStorage.getItem(NAME_KEY);
    } catch { /* Private mode. */ }
    setName(
      sanitizeDisplayName(stored || "") || guestDisplayName(),
    );
    setHydrated(true);
  }, [roomNameKey]);

  const rename = useCallback((value: string) => {
    setName(value);
  }, []);

  const persistName = useCallback((value: string, roomOnly = false) => {
    const clean = sanitizeDisplayName(value) || guestDisplayName();
    try {
      window.localStorage.setItem(roomNameKey, clean);
      if (!roomOnly) window.localStorage.setItem(NAME_KEY, clean);
    } catch { /* Private mode. */ }
    setName(clean);
  }, [roomNameKey]);

  return { clientId, name, hydrated, rename, persistName };
}
