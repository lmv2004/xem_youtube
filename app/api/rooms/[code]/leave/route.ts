import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";
import { withRequestLog } from "@/lib/api-route";
import { normalizeRoomCode } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE = "api:rooms.leave";

/**
 * Removes the caller from the member list.
 *
 * Called both from the Leave button and from `pagehide` via `sendBeacon`,
 * which sends text/plain rather than JSON — hence parsing the raw body
 * instead of using `request.json()`.
 */
export const POST = withRequestLog(SCOPE, async (request, context) => {
  const params = await context.params;
  const raw = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = normalizeRoomCode(raw ?? "");

  const text = await request.text().catch(() => "");
  let clientId = "";
  try {
    const parsed = JSON.parse(text || "{}") as { clientId?: unknown };
    if (typeof parsed.clientId === "string") clientId = parsed.clientId.trim();
  } catch {
    /* malformed beacon payload — nothing to remove */
  }

  if (!clientId) {
    return NextResponse.json({ ok: true });
  }

  const room = await prisma.room.findUnique({ where: { code }, select: { id: true } });
  if (!room) {
    return NextResponse.json({ ok: true });
  }

  await prisma.roomPresence.deleteMany({ where: { roomId: room.id, clientId } });
  log.info(SCOPE, "member left", { code });

  return NextResponse.json({ ok: true });
});
