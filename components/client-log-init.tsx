"use client";
import { useEffect } from "react";

export function ClientLogInit() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      fetch("/api/client-log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scope: "window.onerror",
          message: event.message,
          data: { filename: event.filename, lineno: event.lineno, colno: event.colno },
        }),
        keepalive: true,
      }).catch(() => {});
    };
    const onUnhandled = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
      fetch("/api/client-log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope: "unhandledrejection", message: reason }),
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandled);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, []);
  return null;
}
