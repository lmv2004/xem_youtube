import type { RoomSyncResponse } from "./rooms";

export class RoomClosedError extends Error {}

/** One request at a time. Failures retain room state and retry without rejoining. */
export function startRoomPolling(options: {
  read: (
    after: string | null,
    heartbeat: boolean,
    signal: AbortSignal,
  ) => Promise<RoomSyncResponse>;
  apply: (snapshot: RoomSyncResponse) => void;
  status: (offline: boolean) => void;
  closed: () => void;
  hidden: () => boolean;
}) {
  let stopped = false;
  let paused = false;
  let running = false;
  let requested = false;
  let failures = 0;
  let cursor: string | null = null;
  let heartbeatAt: number | null = null;
  let epoch = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  const poll = async () => {
    if (stopped || paused) return;
    if (running) {
      requested = true;
      return;
    }
    running = true;
    requested = false;
    clearTimeout(timer);
    const request = new AbortController();
    controller = request;
    const startedIn = epoch;
    const cancelled = () => stopped || paused || startedIn !== epoch;
    const timeout = setTimeout(() => request.abort(), 15_000);
    try {
      // A foreground return immediately refreshes presence after a sleeping tab.
      let heartbeat =
        heartbeatAt === null || Date.now() - heartbeatAt >= 20_000;
      let more = true;
      for (let page = 0; more && page < 6 && !stopped; page++) {
        const after = cursor;
        const snapshot = await options.read(after, heartbeat, request.signal);
        if (cancelled()) return;
        if (heartbeat) heartbeatAt = Date.now();
        heartbeat = false;
        options.apply(snapshot);
        cursor = snapshot.cursor;
        more = !!after && snapshot.messages.length === 50 && cursor !== after;
      }
      failures = 0;
      options.status(false);
    } catch (error) {
      // A page can resume before its aborted request settles. That obsolete
      // request must neither apply a snapshot nor count as a connection failure.
      if (cancelled()) return;
      if (error instanceof RoomClosedError) {
        stopped = true;
        options.closed();
        return;
      }
      // A single dropped request must not disable chat or interrupt playback.
      if (++failures >= 3) options.status(true);
    } finally {
      clearTimeout(timeout);
      running = false;
      if (!stopped && !paused) {
        const delay = requested
          ? 0
          : failures
            ? Math.min(15_000, 2000 * 2 ** Math.min(failures - 1, 3))
            : options.hidden()
              ? 15_000
              : 2000;
        timer = setTimeout(() => void poll(), delay);
      }
    }
  };
  void poll();
  return {
    refresh: () => void poll(),
    pause() {
      paused = true;
      epoch++;
      requested = false;
      clearTimeout(timer);
      controller?.abort();
    },
    resume() {
      if (stopped) return;
      paused = false;
      heartbeatAt = null;
      void poll();
    },
    stop() {
      stopped = true;
      epoch++;
      clearTimeout(timer);
      controller?.abort();
    },
  };
}
