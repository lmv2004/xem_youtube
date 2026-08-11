import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withRequestLog } from "@/lib/api-route";
import {
  MESSAGE_PAGE_SIZE,
  normalizeRoomCode,
  type RoomSyncResponse,
} from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Single polling endpoint: playback state + any chat messages newer than the
 * caller's cursor. Kept as one request so a 2s interval costs one round trip
 * instead of two.
 */
export const GET = withRequestLog("api:rooms.sync", async (request, context) => {
  const params = await context.params;
  const raw = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = normalizeRoomCode(raw ?? "");

  const url = new URL(request.url);
  const after = url.searchParams.get("after");

  const room = await prisma.room.findUnique({ where: { code } });
  if (!room) {
    return NextResponse.json({ message: "Phòng không tồn tại." }, { status: 404 });
  }

  const afterDate = after ? new Date(after) : null;
  const validAfter = afterDate && !Number.isNaN(afterDate.getTime()) ? afterDate : null;

  const rows = await prisma.roomMessage.findMany({
    where: {
      roomId: room.id,
      ...(validAfter ? { createdAt: { gt: validAfter } } : {}),
    },
    orderBy: { createdAt: validAfter ? "asc" : "desc" },
    take: MESSAGE_PAGE_SIZE,
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  // Without a cursor we fetch the newest page descending, then flip it so the
  // client always receives messages oldest-first.
  const ordered = validAfter ? rows : [...rows].reverse();

  const messages = ordered.map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    author: m.user,
  }));

  const payload: RoomSyncResponse = {
    playback: {
      isPlaying: room.isPlaying,
      positionSeconds: room.positionSeconds,
      lastSyncAt: room.lastSyncAt.toISOString(),
    },
    video: {
      videoId: room.videoId,
      title: room.videoTitle,
      channel: room.channel,
      thumbnail: room.thumbnail,
      embedUrl: room.embedUrl,
      watchUrl: room.watchUrl,
      duration: room.duration,
    },
    messages,
    cursor: messages.length > 0 ? messages[messages.length - 1].createdAt : after,
    serverTime: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
});
