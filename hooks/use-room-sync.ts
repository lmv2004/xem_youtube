"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { type RoomSyncResponse, type RoomMessageDto, type RoomPlaybackUpdate } from "@/lib/rooms";
import { projectQueue, type QueueEdit } from "@/lib/room-optimistic-queue";
import { mergeMessages } from "@/lib/room-sync";
import { RoomClosedError, startRoomPolling } from "@/lib/room-poller";
import type { RoomCommand } from "@/lib/room-protocol";

type State = Omit<RoomSyncResponse, "cursor" | "playback" | "video"> & {
  playback: RoomSyncResponse["playback"] | null;
  video: RoomSyncResponse["video"] | null;
  queueEdits: QueueEdit[];
  isOffline: boolean;
  hasConnected: boolean;
  showSyncWarning: boolean;
  isClosed: boolean;
  receivedAt: number;
};
const initialState: State = {
  queueEdits: [], queue: [], playbackGeneration: 0, revision: "",
  playback: null, video: null, messages: [], members: [], hostOnlyControl: false,
  serverTime: "", isOffline: true, hasConnected: false,
  showSyncWarning: false, isClosed: false, receivedAt: 0,
};
type Options = { enabled: boolean; clientId: string | null; displayName: string; userId: string | null };
type CommandResult = RoomMessageDto | RoomPlaybackUpdate;

function withPlayback(previous: State, update: RoomPlaybackUpdate, receivedAt = Date.now()): State {
  const queueEdits = previous.queueEdits.filter((edit) => edit.requestId !== update.confirmedCommandId);
  if (previous.revision && update.revision < previous.revision) return { ...previous, queueEdits };
  return { ...previous, ...update, queueEdits, receivedAt };
}
export function useRoomSync(code: string, { enabled, clientId, displayName, userId }: Options) {
  const [state, setState] = useState(initialState);
  const [clockTick, setClockTick] = useState(0);
  const nameRef = useRef(displayName);
  nameRef.current = displayName;
  const readyRef = useRef(false);
  const stopRef = useRef<() => void>(() => {});
  const refreshRef = useRef<() => void>(() => {});
  const commandsRef = useRef(new Set<AbortController>());

  useEffect(() => {
    setState(initialState);
    readyRef.current = false;
    if (!enabled || !clientId) return;
    let active = true;
    const polling = startRoomPolling({
      async read(after, heartbeat, signal) {
        const response = await fetch(`/api/rooms/${code}/sync`, {
          method: "POST", cache: "no-store", signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, displayName: nameRef.current.trim() || "Khách", heartbeat, after }),
        });
        if (response.status === 404) throw new RoomClosedError();
        if (!response.ok) throw new Error("Room sync unavailable");
        return await response.json() as RoomSyncResponse;
      },
      apply(snapshot) {
        setState((previous) => ({
          ...withPlayback(previous, snapshot), members: snapshot.members,
          messages: mergeMessages(previous.messages, snapshot.messages),
        }));
      },
      status(offline) {
        readyRef.current = !offline;
        setState((previous) => ({ ...previous, isOffline: offline,
          hasConnected: previous.hasConnected || !offline, showSyncWarning: offline }));
      },
      closed() {
        readyRef.current = false;
        setState((previous) => ({ ...previous, isClosed: true, isOffline: false, showSyncWarning: false }));
      },
      hidden: () => document.hidden,
    });
    const stop = () => {
      active = false;
      readyRef.current = false;
      polling.stop();
      for (const controller of commandsRef.current) controller.abort();
      commandsRef.current.clear();
    };
    const leaveBody = JSON.stringify({ clientId });
    stopRef.current = () => {
      stop();
      void fetch(`/api/rooms/${code}/leave`, {
        method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: leaveBody,
      }).catch(() => {});
    };
    refreshRef.current = polling.refresh;
    const refresh = () => { if (active && !document.hidden) polling.refresh(); };
    const pageHide = () => {
      polling.pause();
      readyRef.current = false;
      navigator.sendBeacon?.(`/api/rooms/${code}/leave`, leaveBody);
    };
    const pageShow = (event: PageTransitionEvent) => { if (event.persisted && active) polling.resume(); };
    const clock = setInterval(() => { if (!document.hidden) setClockTick((tick) => tick + 1); }, 1000);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pagehide", pageHide);
    window.addEventListener("pageshow", pageShow);
    return () => {
      stop();
      clearInterval(clock);
      refreshRef.current = () => {};
      stopRef.current = () => {};
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("pagehide", pageHide);
      window.removeEventListener("pageshow", pageShow);
    };
  }, [code, clientId, enabled, userId]);

  const request = useCallback(async (
    command: Omit<Extract<RoomCommand, { type: "chat" }>, "requestId">
      | Omit<Extract<RoomCommand, { type: "playback" | "queue" }>, "requestId">
      | Omit<Extract<RoomCommand, { type: "rename" }>, "requestId">,
    chosenRequestId?: string,
  ): Promise<CommandResult> => {
    if (!readyRef.current || !clientId) throw new Error("Không có kết nối với phòng. Vui lòng thử lại.");
    const requestId = chosenRequestId ?? crypto.randomUUID();
    const controller = new AbortController();
    commandsRef.current.add(controller);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 15_000);
    try {
      const response = await fetch(`/api/rooms/${code}/commands`, {
        method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, command: { ...command, requestId } }),
      });
      const result = await response.json() as { data?: CommandResult; message?: string };
      if (response.status === 404) setState((previous) => ({ ...previous, isClosed: true }));
      if (!response.ok || !result.data) throw new Error(result.message || "Không thực hiện được thao tác.");
      refreshRef.current();
      return result.data;
    } catch (error) {
      // Never replay an uncertain mutation automatically; refresh authoritative state.
      if (timedOut || error instanceof TypeError) {
        readyRef.current = false;
        setState((previous) => ({ ...previous, isOffline: true, showSyncWarning: true }));
      }
      refreshRef.current();
      if (timedOut) throw new Error("Chưa nhận được xác nhận. Hãy kiểm tra trước khi gửi lại.");
      throw error instanceof Error ? error : new Error("Mất kết nối. Chưa xác nhận được thao tác.");
    } finally {
      clearTimeout(timer);
      commandsRef.current.delete(controller);
    }
  }, [code, clientId]);
  const visibleQueue = projectQueue(state.queue, state.queueEdits);
  const visibleQueueRef = useRef(visibleQueue);
  visibleQueueRef.current = visibleQueue;
  const queueTail = useRef<Promise<unknown>>(Promise.resolve());
  const editQueue = useCallback(
    (payload: QueueEdit["payload"]) => {
      const requestId = crypto.randomUUID();
      if (payload.action === "move") {
        const moveId = payload.id;
        const index = visibleQueueRef.current.findIndex(
          (item) => item.id === moveId,
        );
        const anchor =
          index < 0
            ? undefined
            : visibleQueueRef.current[
                index + (payload.direction === "up" ? -1 : 1)
              ];
        if (!anchor) return Promise.resolve();
        payload = {
          ...payload,
          ...(payload.direction === "up"
            ? { beforeId: anchor.id }
            : { afterId: anchor.id }),
        };
      }
      const edit = {
        requestId,
        payload:
          payload.action === "add"
            ? { ...payload, id: crypto.randomUUID() }
            : payload,
      };
      visibleQueueRef.current = projectQueue(visibleQueueRef.current, [edit]);
      setState((prev) => ({ ...prev, queueEdits: [...prev.queueEdits, edit] }));
      const send = async () => {
        try {
          const update = (await request(
            { type: "queue", payload: edit.payload },
            requestId,
          )) as RoomPlaybackUpdate;
          setState((prev) =>
            withPlayback(prev, { ...update, confirmedCommandId: requestId }),
          );
        } catch (error) {
          setState((prev) => ({
            ...prev,
            queueEdits: prev.queueEdits.filter(
              (item) => item.requestId !== requestId,
            ),
          }));
          throw error;
        }
      };
      const result = queueTail.current.then(send, send);
      queueTail.current = result.catch(() => {});
      return result;
    },
    [request],
  );
  const refresh = useCallback(() => refreshRef.current(), []);
  const applyPlayback = useCallback(
    (update: RoomPlaybackUpdate) =>
      setState((prev) => withPlayback(prev, update)),
    [],
  );
  const appendLocal = useCallback((message: RoomMessageDto) => {
    setState((prev) => ({
      ...prev,
      messages: mergeMessages(prev.messages, [message]),
    }));
  }, []);
  const leave = useCallback(async () => stopRef.current(), []);
  return {
    ...state,
    queue: visibleQueue,
    editQueue,
    clockTick,
    request,
    refresh,
    appendLocal,
    applyPlayback,
    leave,
  };
}
