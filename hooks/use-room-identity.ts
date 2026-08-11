"use client";
import { useCallback, useEffect, useState } from "react";
import {
  createClientId,
  guestDisplayName,
  sanitizeDisplayName,
} from "@/lib/rooms";

const CLIENT_ID_KEY = "xemphim:room:clientId";
const NAME_KEY = "xemphim:room:name";

/**
 * Identity used inside rooms.
 *
 * Guests can watch, so membership cannot key off a user id. Instead each
 * browser keeps a stable `clientId`, which also lets a client recognise its
 * own playback actions when they come back through polling.
 */
export function useRoomIdentity(preferredName?: string | null) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let id = window.localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = createClientId();
      window.localStorage.setItem(CLIENT_ID_KEY, id);
    }
    setClientId(id);

    // A name the user typed before wins over the account name, which in turn
    // beats a throwaway guest label.
    const stored = window.localStorage.getItem(NAME_KEY);
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
    window.localStorage.setItem(NAME_KEY, clean);
    setName(clean);
    return clean;
  }, []);

  return { clientId, name, hydrated, rename, persistName };
}
