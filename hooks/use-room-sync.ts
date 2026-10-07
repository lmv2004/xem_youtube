"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { type RoomSyncResponse, type RoomMessageDto, type RoomPlaybackUpdate } from "@/lib/rooms";
import { mergeMessages } from "@/lib/room-sync";
import type { RoomEvent, RoomCommand } from "@/lib/room-protocol";

type State = Omit<RoomSyncResponse, "cursor" | "playback" | "video"> & {
  playback: RoomSyncResponse["playback"] | null;
  video: RoomSyncResponse["video"] | null;
  isOffline: boolean; isClosed: boolean; receivedAt: number;
};
const initialState: State = { queue: [], playbackGeneration: 0, revision: "", playback: null, video: null, messages: [], members: [],
  hostOnlyControl: false, serverTime: "", isOffline: true, isClosed: false, receivedAt: 0 };
type Options = { enabled: boolean; clientId: string | null; displayName: string; userId: string | null };
type CommandResult = RoomMessageDto | RoomPlaybackUpdate;
type Pending = { resolve: (data: CommandResult) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout>; controller: AbortController };

function withPlayback(previous: State, update: RoomPlaybackUpdate, receivedAt = Date.now()): State {
  if (previous.revision && update.revision < previous.revision) return previous;
  return { ...previous, ...update, receivedAt };
}
export function useRoomSync(code: string, { enabled, clientId, displayName, userId }: Options) {
  const [state, setState] = useState(initialState);
  const [clockTick, setClockTick] = useState(0);
  const nameRef = useRef(displayName);
  nameRef.current = displayName;
  const socketRef = useRef<WebSocket | null>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef(new Map<string, Pending>());
  const stopRef = useRef<() => void>(() => {});
  const reconnectRef = useRef<() => void>(() => {});

  useEffect(() => {
    setState(initialState);
    if (!enabled || !clientId) return;
    let stopped = false;
    let generation = 0;
    let attempt = 0;
    let cursor: string | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let connectTimer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;
    const pending = pendingRef.current;
    const rejectPending = () => {
      for (const item of pending.values()) { clearTimeout(item.timer); item.controller.abort(); item.reject(new Error("Mất kết nối. Chưa xác nhận được thao tác.")); }
      pending.clear();
    };
    const applyEvent = (event: RoomEvent) => {
      if (event.type === "chat") setState((prev) => ({ ...prev, messages: mergeMessages(prev.messages, [event.message]) }));
      if (event.type === "playback") setState((prev) => withPlayback(prev, event.update));
      if (event.type === "members") setState((prev) => ({ ...prev, members: event.members }));
    };
    const stop = () => {
      stopped = true; generation++;
      readyRef.current = false;
      clearTimeout(retryTimer); clearTimeout(connectTimer);
      controller?.abort();
      socketRef.current?.close(); socketRef.current = null;
      rejectPending();
    };
    stopRef.current = stop;
    const connect = () => {
      if (stopped) return;
      clearTimeout(retryTimer); clearTimeout(connectTimer);
      controller?.abort();
      const current = ++generation;
      socketRef.current?.close();
      readyRef.current = false;
      rejectPending();
      const url = new URL(`/api/rooms/${code}/socket`, window.location.origin);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.searchParams.set("clientId", clientId);
      url.searchParams.set("name", nameRef.current.trim().slice(0, 40) || "Khách");
      const socket = new WebSocket(url);
      socketRef.current = socket;
      let bootstrapping = true;
      const buffered: RoomEvent[] = [];
      const active = () => !stopped && current === generation;
      connectTimer = setTimeout(() => socket.close(), 15_000);
      socket.onmessage = async (message) => {
        if (!active()) return;
        let event: RoomEvent;
        try { event = JSON.parse(message.data); } catch { socket.close(); return; }
        if (event.type === "closed") {
          stop(); setState((prev) => ({ ...prev, isClosed: true, isOffline: false })); return;
        }
        if (event.type === "ack") {
          const item = pending.get(event.requestId);
          if (!item) return;
          pending.delete(event.requestId); clearTimeout(item.timer);
          if (event.ok && event.data) item.resolve(event.data);
          else item.reject(new Error(event.message || "Không thực hiện được thao tác."));
          return;
        }
        if (event.type === "ready") {
          clearTimeout(connectTimer);
          controller = new AbortController();
          const requestController = controller;
          const timeout = setTimeout(() => requestController.abort(), 30_000);
          try {
            // Catch up missed pages after reconnect, then replay live events received during the snapshot.
            let more = true;
            while (more && active()) {
              const response = await fetch(`/api/rooms/${code}/sync`, { method: "POST", cache: "no-store",
                signal: requestController.signal, headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientId, displayName: nameRef.current, heartbeat: false, after: cursor }) });
              if (!active()) return;
              if (response.status === 404) { stop(); setState((prev) => ({ ...prev, isClosed: true, isOffline: false })); return; }
              if (!response.ok) throw new Error("Snapshot failed");
              const snapshot = await response.json() as RoomSyncResponse;
              if (!active()) return;
              const oldCursor = cursor;
              cursor = snapshot.cursor;
              more = snapshot.messages.length === 50 && cursor !== oldCursor;
              setState((prev) => ({ ...withPlayback(prev, snapshot), members: snapshot.members,
                messages: mergeMessages(prev.messages, snapshot.messages) }));
            }
            if (!active()) return;
            for (const bufferedEvent of buffered) applyEvent(bufferedEvent);
            buffered.length = 0;
            bootstrapping = false; readyRef.current = true; attempt = 0;
            setState((prev) => ({ ...prev, isOffline: false }));
          } catch { if (active()) socket.close(); }
          finally { clearTimeout(timeout); }
          return;
        }
        if (bootstrapping) {
          buffered.push(event);
          if (buffered.length > 500) socket.close();
        } else applyEvent(event);
      };
      socket.onclose = () => {
        if (!active()) return;
        clearTimeout(connectTimer); controller?.abort(); readyRef.current = false;
        rejectPending();
        setState((prev) => ({ ...prev, isOffline: true }));
        retryTimer = setTimeout(connect, Math.min(30_000, 1000 * 2 ** Math.min(attempt++, 5)) + Math.random() * 300);
      };
      socket.onerror = () => { if (active()) socket.close(); };
    };
    const reconnect = () => {
      if (socketRef.current?.readyState !== WebSocket.OPEN && socketRef.current?.readyState !== WebSocket.CONNECTING) connect();
    };
    reconnectRef.current = reconnect;
    const visibility = () => { if (!document.hidden) reconnect(); };
    const pageHide = () => stop();
    const pageShow = (event: PageTransitionEvent) => { if (event.persisted) { stopped = false; connect(); } };
    connect();
    // Purely local playback clock; this interval performs no network requests.
    const clock = setInterval(() => { if (!document.hidden) setClockTick((tick) => tick + 1); }, 1000);
    window.addEventListener("online", reconnect);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pageHide); window.addEventListener("pageshow", pageShow);
    return () => {
      stop(); clearInterval(clock); reconnectRef.current = () => {};
      window.removeEventListener("online", reconnect);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pageHide); window.removeEventListener("pageshow", pageShow);
    };
  }, [code, clientId, enabled, userId]);

  const request = useCallback((command: Omit<Extract<RoomCommand, { type: "chat" }>, "requestId"> |
    Omit<Extract<RoomCommand, { type: "playback" | "queue" }>, "requestId">): Promise<CommandResult> => {
    const socket = socketRef.current;
    if (!readyRef.current || socket?.readyState !== WebSocket.OPEN) return Promise.reject(new Error("Phòng đang kết nối lại. Vui lòng thử lại khi có kết nối."));
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        pendingRef.current.delete(requestId);
        controller.abort();
        // A transport timeout makes the cached state uncertain. Stop local
        // reconciliation until reconnect reloads authoritative room state.
        readyRef.current = false;
        setState((previous) => ({ ...previous, isOffline: true }));
        socket.close();
        reject(new Error("Chưa nhận được xác nhận. Hãy kiểm tra trước khi gửi lại."));
      }, 15_000);
      pendingRef.current.set(requestId, { resolve, reject, timer, controller });
      void fetch(`/api/rooms/${code}/commands`, {
        method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, command: { ...command, requestId } }),
      }).then(async (response) => {
        const result = await response.json() as { data?: CommandResult; message?: string };
        if (!pendingRef.current.has(requestId)) return;
        clearTimeout(timer); pendingRef.current.delete(requestId);
        if (response.ok && result.data) resolve(result.data);
        else reject(new Error(result.message || "Không thực hiện được thao tác."));
      }).catch(() => {
        if (!pendingRef.current.has(requestId)) return;
        clearTimeout(timer); pendingRef.current.delete(requestId);
        reject(new Error("Mất kết nối. Chưa xác nhận được thao tác."));
      });
    });
  }, [code, clientId]);
  const refresh = useCallback(() => reconnectRef.current(), []);
  const applyPlayback = useCallback((update: RoomPlaybackUpdate) => setState((prev) => withPlayback(prev, update)), []);
  const appendLocal = useCallback((message: RoomMessageDto) => {
    setState((prev) => ({ ...prev, messages: mergeMessages(prev.messages, [message]) }));
  }, []);
  const leave = useCallback(async () => stopRef.current(), []);
  return { ...state, clockTick, request, refresh, appendLocal, applyPlayback, leave };
}
