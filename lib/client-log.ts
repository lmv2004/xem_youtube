// Tiny client-side logger that mirrors the server logger to the console.
// Useful when the API returns 400/500 and we want to see what payload was sent.
// In production also POSTs to /api/client-log so the same logs/YYYY-MM-DD.log
// captures the browser-side error context.

"use client";

import { log } from "@/lib/logger-shared";

export const clientLog = log;

export function reportClientError(scope: string, message: string, data?: unknown): void {
  // Always log to console for live debugging.
  // eslint-disable-next-line no-console
  console.warn(`[client:${scope}]`, message, data ?? "");
  // Best-effort: also push to server log so it shows up in the same file.
  if (typeof window !== "undefined") {
    fetch("/api/client-log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope, message, data }),
      keepalive: true,
    }).catch(() => {
      /* ignore */
    });
  }
}
