/** The server deliberately renews connections before the function duration limit. */
export function isScheduledRoomRenewal(event: {
  code: number;
  reason: string;
}) {
  return event.code === 1012 && event.reason === "Reconnect";
}
export const ROOM_RECONNECT_NOTICE_DELAY_MS = 3000;

/** Delay only expected renewal notices. Real failures remain immediately visible. */
export function createRoomReconnectNotice(
  changed: (showWarning: boolean) => void,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let renewing = false;
  let disposed = false;
  const waiters = new Set<{
    resolve: () => void;
    reject: (error: Error) => void;
  }>();
  const clear = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const rejectWaiters = () => {
    for (const waiter of waiters)
      waiter.reject(
        new Error("Phòng đang kết nối lại. Vui lòng thử lại khi có kết nối."),
      );
    waiters.clear();
  };
  return {
    get renewing() {
      return renewing && !disposed;
    },
    begin(expected: boolean) {
      if (disposed) return;
      if (!expected) {
        clear();
        renewing = false;
        rejectWaiters();
        changed(true);
        return;
      }
      if (renewing) return; // Retries must not reset the notice deadline.
      renewing = true;
      changed(false);
      timer = setTimeout(() => {
        timer = undefined;
        if (!disposed && renewing) changed(true);
      }, ROOM_RECONNECT_NOTICE_DELAY_MS);
    },
    restored() {
      if (disposed) return;
      clear();
      renewing = false;
      changed(false);
      for (const waiter of waiters) waiter.resolve();
      waiters.clear();
    },
    waitForReady() {
      if (disposed || !renewing)
        return Promise.reject(
          new Error("Phòng đang kết nối lại. Vui lòng thử lại khi có kết nối."),
        );
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          waiters.delete(waiter);
          reject(
            new Error(
              "Phòng đang kết nối lại. Vui lòng thử lại khi có kết nối.",
            ),
          );
        }, 15_000);
        const waiter = {
          resolve: () => {
            clearTimeout(timeout);
            resolve();
          },
          reject: (error: Error) => {
            clearTimeout(timeout);
            reject(error);
          },
        };
        waiters.add(waiter);
      });
    },
    dispose() {
      disposed = true;
      renewing = false;
      clear();
      rejectWaiters();
    },
  };
}
