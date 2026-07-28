import { log } from "@/lib/logger";
import { withRequestLog } from "@/lib/api-route";

type ClientLogPayload = { scope?: string; message?: string; data?: unknown };

export const POST = withRequestLog("api:client-log", async (request) => {
  const body = (await request.json().catch(() => null)) as ClientLogPayload | null;
  const scope = body?.scope ?? "client";
  const message = body?.message ?? "client log";
  log.warn(`client:${scope}`, message, body?.data);
  return new Response(null, { status: 204 });
});
