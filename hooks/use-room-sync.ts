"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  SYNC_INTERVAL_MS,
  type RoomMemberDto,
  type RoomMessageDto,
  type RoomPlayback,
  type RoomSyncResponse,
  type RoomVideo,
} from "@/lib/rooms";

type State = {
  playback: RoomPlayback | null;
  video: RoomVideo | null;
  messages: RoomMessageDto[];
  members: RoomMemberDto[];
  serverTime: string | null;
  isOffline: boolean;
};

type Options = {
  enabled: boolean;
  clientId: string | null;
  displayName: string;
};

/**
 * Polls the room every couple of seconds.
 *
 * The poll is a POST because it doubles as the presence heartbeat: the server
 * refreshes this client's `lastSeenAt` and returns the current member list in
 * the same response, so showing who is watching costs no extra requests.
 *
 * Polling pauses while the tab is hidden — a backgrounded tab does not need
 * updates and browsers throttle its timers anyway. We refresh immediately on
 * the way back so the player catches up at once.
 */
export function useRoomSync(code: string, { enabled, clientId, displayName }: Options) {
  const [state, setState] = useState<State>({
    playback: null,
    video: null,
    messages: [],
    members: [],
    serverTime: null,
    isOffline: false,
  });

  const cursorRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Read inside the poll so a rename does not restart the interval.
  const nameRef = useRef(displayName);
  nameRef.current = displayName;

  const poll = useCallback(async () => {
    if (!clientId) return;
    // Skip if a previous request is still running, otherwise a slow network
    // would stack up requests faster than they resolve.
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const res = await fetch("/api/rooms/" + code + "/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          clientId,
          displayName: nameRef.current,
          after: cursorRef.current,
        }),
      });

      if (!res.ok) {
        setState((s) => ({ ...s, isOffline: res.status >= 500 }));
        return;
      }

      const json = (await res.json()) as RoomSyncResponse;
      cursorRef.current = json.cursor ?? cursorRef.current;

      setState((prev) => {
        const fresh = json.messages.filter((m) => !seenIdsRef.current.has(m.id));
        fresh.forEach((m) => seenIdsRef.current.add(m.id));
        return {
          playback: json.playback,
          video: json.video,
          members: json.members,
          messages: fresh.length > 0 ? [...prev.messages, ...fresh] : prev.messages,
          serverTime: json.serverTime,
          isOffline: false,
        };
      });
    } catch {
      setState((s) => ({ ...s, isOffline: true }));
    } finally {
      inFlightRef.current = false;
    }
  }, [code, clientId]);

  useEffect(() => {
    if (!enabled || !clientId) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer !== null) return;
      void poll();
      timer = setInterval(() => void poll(), SYNC_INTERVAL_MS);
    };
    const stop = () => {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    // Closing the tab should remove us from the list right away rather than
    // waiting for the heartbeat to go stale. sendBeacon survives unload.
    const onPageHide = () => {
      navigator.sendBeacon?.(
        "/api/rooms/" + code + "/leave",
        new Blob([JSON.stringify({ clientId })], { type: "text/plain" }),
      );
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [enabled, clientId, code, poll]);

  /** Optimistically append a message the current user just sent. */
  const appendLocal = useCallback((message: RoomMessageDto) => {
    if (seenIdsRef.current.has(message.id)) return;
    seenIdsRef.current.add(message.id);
    if (!cursorRef.current || message.createdAt > cursorRef.current) {
      cursorRef.current = message.createdAt;
    }
    setState((prev) => ({ ...prev, messages: [...prev.messages, message] }));
  }, []);

  const leave = useCallback(async () => {
    if (!clientId) return;
    try {
      await fetch("/api/rooms/" + code + "/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
        keepalive: true,
      });
    } catch {
      /* the row goes stale on its own */
    }
  }, [code, clientId]);

  return { ...state, refresh: poll, appendLocal, leave };
}
