// Helper to wrap a Next.js route handler with consistent request logging.
// Logs scope + method + path + status + durationMs + userId (if present) + error.
// Usage:
//   export const GET = withRequestLog("api:videos", async (req, ctx) => { ... });

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { log } from "@/lib/logger";

// Next.js route handlers receive `ctx.params` as Promise<{[k]: string}>.
// We type it loosely so wrapped handlers can keep their own narrowing.
type RouteContext = { params: Promise<Record<string, string | string[]>> };

type Handler = (request: Request, context: RouteContext) => Promise<Response> | Response;

export function withRequestLog(scope: string, handler: Handler): Handler {
  return async (request, context) => {
    const start = Date.now();
    const url = new URL(request.url);
    let session: { user?: { id?: string } } | null = null;
    try {
      session = await auth();
    } catch {
      session = null;
    }
    const userId = session?.user?.id;
    log.info(scope, "request received", {
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      userId,
    });
    try {
      const res = await handler(request, context);
      log.info(scope, "response sent", {
        method: request.method,
        path: url.pathname,
        status: res.status,
        durationMs: Date.now() - start,
        userId,
      });
      return res;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      log.error(scope, "handler threw", {
        method: request.method,
        path: url.pathname,
        durationMs: Date.now() - start,
        userId,
        err: message,
      });
      return NextResponse.json(
        { message: "Đã xảy ra lỗi không mong muốn." },
        { status: 500 },
      );
    }
  };
}
