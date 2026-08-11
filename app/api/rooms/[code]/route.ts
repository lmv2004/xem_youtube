import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";
import { withRequestLog } from "@/lib/api-route";
import { normalizeRoomCode, type RoomDto } from "@/lib/rooms";

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
    },
    createdAt: room.createdAt.toISOString(),
  };

  return NextResponse.json({ room: dto, serverTime: new Date().toISOString() });
});

const patchSchema = z.object({
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

/** Host-only playback control. */
export const PATCH = withRequestLog(SCOPE + ".update", async (request, context) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const code = await readCode(context);
  const room = await prisma.room.findUnique({ where: { code } });
  if (!room) {
    return NextResponse.json({ message: "Phòng không tồn tại." }, { status: 404 });
  }
  if (room.hostId !== session.user.id) {
    return NextResponse.json(
      { message: "Chỉ chủ phòng mới điều khiển được." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const { isPlaying, positionSeconds, video } = parsed.data;

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
    },
  });

  log.info(SCOPE + ".update", "playback updated", {
    userId: session.user.id,
    code,
    isPlaying: updated.isPlaying,
    changedVideo: Boolean(video),
  });

  return NextResponse.json({
    playback: {
      isPlaying: updated.isPlaying,
      positionSeconds: updated.positionSeconds,
      lastSyncAt: updated.lastSyncAt.toISOString(),
    },
    serverTime: new Date().toISOString(),
  });
});
