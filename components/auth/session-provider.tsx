"use client";
import { SessionContext, SessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { useEffect, useState } from "react";
import { readConfirmedSession } from "@/lib/session-response";

/** Keep the last verified UI identity through transient Auth.js fetch failures.
 * Server routes still authenticate every protected operation independently. */
function ConfirmedSession({ children }: { children: React.ReactNode }) {
  const source = useSession();
  const [confirmed, setConfirmed] = useState<Session | null | undefined>(
    undefined,
  );
  useEffect(() => {
    if (source.data?.user) {
      setConfirmed(source.data);
      return;
    }
    if (source.status === "loading") return;
    let active = true;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | undefined;
    const verify = async () => {
      clearTimeout(timer);
      controller?.abort();
      const current = new AbortController();
      controller = current;
      const timeout = setTimeout(() => current.abort(), 10_000);
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
          signal: current.signal,
        });
        const session = await readConfirmedSession(response);
        if (active && !current.signal.aborted) {
          attempt = 0;
          setConfirmed(session);
        }
      } catch {
        if (active && controller === current) {
          timer = setTimeout(
            () => void verify(),
            Math.min(30_000, 3000 * 2 ** Math.min(attempt++, 3)),
          );
        }
      } finally {
        clearTimeout(timeout);
      }
    };
    const visible = () => {
      if (!document.hidden) void verify();
    };
    const channel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel("next-auth");
    channel?.addEventListener("message", visible);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);
    void verify();
    return () => {
      active = false;
      clearTimeout(timer);
      controller?.abort();
      channel?.close();
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", visible);
    };
  }, [source.data, source.status]);
  const data = source.data?.user ? source.data : confirmed;
  const value = data
    ? { data, status: "authenticated" as const, update: source.update }
    : data === null
      ? {
          data: null,
          status: "unauthenticated" as const,
          update: source.update,
        }
      : { data: null, status: "loading" as const, update: source.update };
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <ConfirmedSession>{children}</ConfirmedSession>
    </SessionProvider>
  );
}
