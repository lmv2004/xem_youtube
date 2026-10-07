"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { HEARTBEAT_INTERVAL_MS, type RoomSyncResponse, type RoomMessageDto, type RoomPlaybackUpdate } from "@/lib/rooms";
import { mergeMessages, syncDelay } from "@/lib/room-sync";

type State = Omit<RoomSyncResponse, "cursor" | "playback" | "video"> & {
  playback: RoomSyncResponse["playback"] | null;
  video: RoomSyncResponse["video"] | null;
  isOffline: boolean;
  isClosed: boolean;
  receivedAt: number;
};
const initialState: State = {
  playback: null, video: null, messages: [], members: [], hostOnlyControl: false,
  serverTime: "", isOffline: false, isClosed: false, receivedAt: 0,
};
type Options = { enabled: boolean; clientId: string | null; displayName: string };

export function useRoomSync(code: string, { enabled, clientId, displayName }: Options) {
  const [state, setState] = useState(initialState);
  const nameRef = useRef(displayName);
  nameRef.current = displayName;
  const refreshRef = useRef<() => void>(() => {});
  const stopRef = useRef<() => void>(() => {});
  const mutationRef = useRef(0);

  useEffect(() => {
    setState(initialState);
    if (!enabled || !clientId) return;
    let stopped = false;
    let running = false;
    let queued = false;
    let cursor: string | null = null;
    let heartbeatAt = 0;
    let playing = false;
    let failures = 0;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
    };
    stopRef.current = stop;

    const poll = async () => {
      if (stopped) return;
      clearTimeout(timer);
      if (running) { queued = true; return; }
      running = true;
      const requestController = new AbortController();
      controller = requestController;
      const timeout = setTimeout(() => requestController.abort(), 10_000);
      const sentAt = Date.now();
      const mutation = mutationRef.current;
      const heartbeat = sentAt - heartbeatAt >= HEARTBEAT_INTERVAL_MS;
      try {
        const res = await fetch(`/api/rooms/${code}/sync`, {
          method: "POST", cache: "no-store", signal: requestController.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, displayName: nameRef.current, after: cursor, heartbeat }),
        });
        if (stopped) return;
        if (res.status === 404) {
          stop();
          setState((prev) => ({ ...prev, isClosed: true, isOffline: false }));
          return;
        }
        if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
        const json = await res.json() as RoomSyncResponse;
        if (stopped) return;
        const receivedAt = Date.now();
        if (heartbeat) heartbeatAt = sentAt;
        cursor = json.cursor;
        playing = json.playback.isPlaying;
        failures = 0;
        const stalePlayback = mutation !== mutationRef.current;
        setState((prev) => ({
          ...json, messages: mergeMessages(prev.messages, json.messages),
          // Estimate the response trip without trusting the device's wall clock.
          serverTime: new Date(Date.parse(json.serverTime) + Math.min(1000, (receivedAt - sentAt) / 2)).toISOString(),
          receivedAt, isOffline: false, isClosed: false,
          // A poll started before a mutation acknowledgement must not undo it.
          ...(stalePlayback ? {
            playback: prev.playback, video: prev.video, hostOnlyControl: prev.hostOnlyControl,
            serverTime: prev.serverTime, receivedAt: prev.receivedAt,
          } : {}),
        }));
      } catch {
        if (!stopped) {
          failures += 1;
          setState((prev) => ({ ...prev, isOffline: true }));
        }
      } finally {
        clearTimeout(timeout);
        running = false;
        controller = null;
        if (!stopped) {
          timer = setTimeout(() => void poll(), queued ? 0 : syncDelay(playing, document.hidden, failures));
          queued = false;
        }
      }
    };
    const refresh = () => { void poll(); };
    const onVisibility = () => { if (!document.hidden) { heartbeatAt = 0; refresh(); } };
    const onOnline = () => { heartbeatAt = 0; refresh(); };
    const onPageHide = () => {
      stop();
      navigator.sendBeacon?.(`/api/rooms/${code}/leave`,
        new Blob([JSON.stringify({ clientId })], { type: "text/plain" }));
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) { stopped = false; heartbeatAt = 0; refresh(); }
    };
    refreshRef.current = refresh;
    refresh();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      stop();
      refreshRef.current = () => {};
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [enabled, clientId, code]);

  const refresh = useCallback(() => refreshRef.current(), []);
  const applyPlayback = useCallback((update: RoomPlaybackUpdate) => {
    mutationRef.current += 1;
    setState((prev) => ({ ...prev, ...update, receivedAt: Date.now(), isOffline: false }));
  }, []);
  const appendLocal = useCallback((message: RoomMessageDto) => {
    setState((prev) => ({ ...prev, messages: mergeMessages(prev.messages, [message]) }));
    refreshRef.current();
  }, []);
  const leave = useCallback(async () => {
    stopRef.current();
    if (!clientId) return;
    try {
      await fetch(`/api/rooms/${code}/leave`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }), keepalive: true,
      });
    } catch { /* Presence expires if the network is unavailable. */ }
  }, [code, clientId]);
  return { ...state, refresh, appendLocal, leave, applyPlayback };
}
