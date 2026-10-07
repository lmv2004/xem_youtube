import { NextResponse } from "next/server";
import { notifyRoom, updatePlayback, RoomCommandError } from "@/lib/room-commands";
import { auth } from "@/auth";
import { deleteOwnedRoom } from "@/lib/delete-room";
import { prisma } from "@/lib/db";
import { withRequestLog } from "@/lib/api-route";
import {
  normalizeRoomCode,
  type PlaybackActionKind,
  type RoomDto,
} from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE = "api:rooms.detail";

async function readCode(context: { params: Promise<Record<string, string | string[]>> }) {
  const params = await context.params;
  const raw = Array.isArray(params.code) ? params.code[0] : params.code;
  return normalizeRoomCode(raw ?? "");
}

/** Anyone with the link may read a room — watching is open, chatting is not. */
export const GET = withRequestLog(SCOPE, async (_request, context) => {
  const code = await readCode(context);
  const room = await prisma.room.findUnique({
    where: { code },
    include: { host: { select: { id: true, name: true, image: true } } },
  });

  if (!room) {
    return NextResponse.json({ message: "Phòng không tồn tại." }, { status: 404 });
  }

  const dto: RoomDto = {
    code: room.code,
    title: room.title,
    host: room.host,
    video: {
      videoId: room.videoId,
      title: room.videoTitle,
      channel: room.channel,
      thumbnail: room.thumbnail,
      embedUrl: room.embedUrl,
      watchUrl: room.watchUrl,
      duration: room.duration,
    },
    playback: {
      isPlaying: room.isPlaying,
      positionSeconds: room.positionSeconds,
      lastSyncAt: room.lastSyncAt.toISOString(),
      lastActionBy: room.lastActionBy,
      lastActionById: room.lastActionById,
      lastActionKind: (room.lastActionKind as PlaybackActionKind | null) ?? null,
    },
    hostOnlyControl: room.hostOnlyControl,
    createdAt: room.createdAt.toISOString(),
  };

  return NextResponse.json({ room: dto, serverTime: new Date().toISOString() });
});

export const PATCH = withRequestLog(SCOPE + ".update", async (request, context) => {
  const session = await auth();
  const body = await request.json().catch(() => null);
  if (typeof body?.clientId !== "string" || body.clientId.length > 64) {
    return NextResponse.json({ message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  try {
    return NextResponse.json(await updatePlayback(await readCode(context), body.clientId, session?.user ?? {}, body));
  } catch (error) {
    if (error instanceof RoomCommandError) return NextResponse.json({ message: error.message }, { status: error.status });
    throw error;
  }
}, { authenticate: false });

export const DELETE = withRequestLog(SCOPE + ".delete", async (_request, context) => {
  const session = await auth();
  const code = await readCode(context);
  const result = await prisma.$transaction(async (tx) => {
    const result = await deleteOwnedRoom(tx.room, code, session?.user?.id);
    if (result.status === 200) await notifyRoom(tx, { code, kind: "closed" });
    return result;
  });
  return NextResponse.json({ message: result.message }, { status: result.status });
});
