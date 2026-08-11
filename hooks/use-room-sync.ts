"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  SYNC_INTERVAL_MS,
  type RoomMessageDto,
  type RoomPlayback,
  type RoomSyncResponse,
  type RoomVideo,
} from "@/lib/rooms";

type State = {
  playback: RoomPlayback | null;
  video: RoomVideo | null;
  messages: RoomMessageDto[];
  serverTime: string | null;
  isOffline: boolean;
};

/**
 * Polls the room sync endpoint every couple of seconds.
 *
 * Polling pauses while the tab is hidden — a backgrounded tab does not need
 * updates, and browsers throttle its timers anyway. We refresh immediately on
 * the way back so the player catches up at once.
 */
export function useRoomSync(code: string, enabled = true) {
  const [state, setState] = useState<State>({
    playback: null,
    video: null,
    messages: [],
    serverTime: null,
    isOffline: false,
  });

  const cursorRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const poll = useCallback(async () => {
    // Skip if a previous request is still running, otherwise a slow network
    // would stack up requests faster than they resolve.
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const params = new URLSearchParams();
      if (cursorRef.current) params.set("after", cursorRef.current);
      const qs = params.toString();
      const res = await fetch(
        "/api/rooms/" + code + "/sync" + (qs ? "?" + qs : ""),
        { cache: "no-store" },
      );
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
  }, [code]);

  useEffect(() => {
    if (!enabled) return;

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

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, poll]);

  /** Optimistically append a message the current user just sent. */
  const appendLocal = useCallback((message: RoomMessageDto) => {
    if (seenIdsRef.current.has(message.id)) return;
    seenIdsRef.current.add(message.id);
    if (!cursorRef.current || message.createdAt > cursorRef.current) {
      cursorRef.current = message.createdAt;
    }
    setState((prev) => ({ ...prev, messages: [...prev.messages, message] }));
  }, []);

  return { ...state, refresh: poll, appendLocal };
}
