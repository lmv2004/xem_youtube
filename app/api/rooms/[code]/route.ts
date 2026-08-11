import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";
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
    createdAt: room.createdAt.toISOString(),
  };

  return NextResponse.json({ room: dto, serverTime: new Date().toISOString() });
});

const patchSchema = z.object({
  clientId: z.string().trim().min(1).max(64),
  isPlaying: z.boolean().optional(),
  positionSeconds: z.number().min(0).max(86_400).optional(),
  video: z
    .object({
      videoId: z.string().trim().min(1).max(32),
      title: z.string().trim().min(1).max(300),
      channel: z.string().trim().max(200).default(""),
      thumbnail: z.string().trim().max(600).default(""),
      embedUrl: z.string().trim().min(1).max(600),
      watchUrl: z.string().trim().min(1).max(600),
      duration: z.number().int().min(0).max(86_400).default(0),
    })
    .optional(),
});

/**
 * Playback control is open to every member of the room, not just the host.
 *
 * The only gate is presence: you must have joined (which anyone with the link
 * can do) so that we have a name to attribute the action to and so a random
 * caller cannot drive a room they never opened.
 */
export const PATCH = withRequestLog(SCOPE + ".update", async (request, context) => {
  const code = await readCode(context);

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const room = await prisma.room.findUnique({ where: { code } });
  if (!room) {
    return NextResponse.json({ message: "Phòng không tồn tại." }, { status: 404 });
  }

  const { clientId, isPlaying, positionSeconds, video } = parsed.data;

  const presence = await prisma.roomPresence.findUnique({
    where: { roomId_clientId: { roomId: room.id, clientId } },
  });
  if (!presence) {
    return NextResponse.json(
      { message: "Bạn cần tham gia phòng trước khi điều khiển." },
      { status: 403 },
    );
  }

  const kind: PlaybackActionKind = video
    ? "video"
    : isPlaying === true
      ? "play"
      : isPlaying === false
        ? "pause"
        : "seek";

  // Every write re-anchors lastSyncAt, otherwise viewers would keep
  // extrapolating from a stale timestamp and drift further each poll.
  const updated = await prisma.room.update({
    where: { code },
    data: {
      ...(isPlaying === undefined ? {} : { isPlaying }),
      ...(positionSeconds === undefined ? {} : { positionSeconds }),
      ...(video
        ? {
            videoId: video.videoId,
            videoTitle: video.title,
            channel: video.channel,
            thumbnail: video.thumbnail,
            embedUrl: video.embedUrl,
            watchUrl: video.watchUrl,
            duration: video.duration,
            positionSeconds: 0,
          }
        : {}),
      lastSyncAt: new Date(),
      lastActionBy: presence.name,
      lastActionById: clientId,
      lastActionKind: kind,
    },
  });

  log.info(SCOPE + ".update", "playback updated", {
    code,
    by: presence.name,
    kind,
    isPlaying: updated.isPlaying,
  });

  return NextResponse.json({
    playback: {
      isPlaying: updated.isPlaying,
      positionSeconds: updated.positionSeconds,
      lastSyncAt: updated.lastSyncAt.toISOString(),
      lastActionBy: updated.lastActionBy,
      lastActionById: updated.lastActionById,
      lastActionKind: (updated.lastActionKind as PlaybackActionKind | null) ?? null,
    },
    serverTime: new Date().toISOString(),
  });
});
