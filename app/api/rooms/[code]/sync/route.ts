import { messageCursor, parseMessageCursor } from "@/lib/room-sync";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { withRequestLog } from "@/lib/api-route";
import {
  MESSAGE_PAGE_SIZE,
  PRESENCE_TIMEOUT_MS,
  normalizeRoomCode,
  sanitizeDisplayName,
  type PlaybackActionKind,
  type RoomSyncResponse,
} from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE = "api:rooms.sync";

const syncSchema = z.object({
  clientId: z.string().trim().min(1).max(64),
  displayName: z.string().trim().min(1).max(60),
  after: z.string().trim().max(120).nullish(),
  heartbeat: z.boolean().default(true),
});

/**
 * Single polling endpoint: playback state, new chat messages, the member
 * list, and the control lock — one round trip per tick instead of four.
 *
 * This is a POST because the poll doubles as the presence heartbeat: it
 * refreshes the caller's `lastSeenAt` and sweeps members who stopped polling.
 */
export const POST = withRequestLog(SCOPE, async (request, context) => {
  const params = await context.params;
  const raw = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = normalizeRoomCode(raw ?? "");

  const body = await request.json().catch(() => null);
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  const { clientId, after } = parsed.data;
  const displayName = sanitizeDisplayName(parsed.data.displayName) || "Khách";

  const room = await prisma.room.findUnique({ where: { code } });
  if (!room) {
    return NextResponse.json({ message: "Phòng không tồn tại." }, { status: 404 });
  }

  const now = new Date();
  if (parsed.data.heartbeat) {
    const session = await auth();

    // Ordinary state polls stay read-only; authenticate/write on heartbeats only.
    try {
    await prisma.roomPresence.upsert({
      where: { roomId_clientId: { roomId: room.id, clientId } },
      create: {
        roomId: room.id,
        clientId,
        userId: session?.user?.id ?? null,
        name: displayName,
        image: session?.user?.image ?? null,
        lastSeenAt: now,
      },
      update: {
        lastSeenAt: now,
        name: displayName,
        userId: session?.user?.id ?? null,
        image: session?.user?.image ?? null,
      },
    });

    } catch (error) {
      // The host can delete the room while this heartbeat is in flight.
      if (!await prisma.room.findUnique({ where: { code } })) {
        return NextResponse.json({ message: "Phòng đã đóng." }, { status: 404 });
      }
      throw error;
    }

    await prisma.roomPresence.deleteMany({
      where: {
        roomId: room.id,
        lastSeenAt: { lt: new Date(now.getTime() - PRESENCE_TIMEOUT_MS) },
      },
    });

  }

  const cursor = parseMessageCursor(after);

  const [rows, presences] = await Promise.all([
    prisma.roomMessage.findMany({
      where: {
        roomId: room.id,
        ...(cursor ? cursor.id ? { OR: [
          { createdAt: { gt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { gt: cursor.id } },
        ] } : { createdAt: { gte: cursor.createdAt } } : {}),
      },
      orderBy: [{ createdAt: cursor ? "asc" : "desc" }, { id: cursor ? "asc" : "desc" }],
      take: MESSAGE_PAGE_SIZE,
      include: { user: { select: { id: true, name: true, image: true } } },
    }),
    prisma.roomPresence.findMany({
      where: { roomId: room.id, lastSeenAt: { gte: new Date(now.getTime() - PRESENCE_TIMEOUT_MS) } },
      orderBy: { joinedAt: "asc" },
      take: 100,
    }),
  ]);

  // Without a cursor we fetch the newest page descending, then flip it so the
  // client always receives messages oldest-first.
  const ordered = cursor ? rows : [...rows].reverse();

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
      lastActionBy: room.lastActionBy,
      lastActionById: room.lastActionById,
      lastActionKind: (room.lastActionKind as PlaybackActionKind | null) ?? null,
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
    members: presences.map((p) => ({
      clientId: p.clientId,
      name: p.name,
      image: p.image,
      isHost: p.userId === room.hostId,
      isGuest: !p.userId,
      joinedAt: p.joinedAt.toISOString(),
    })),
    hostOnlyControl: room.hostOnlyControl,
    cursor: messages.length > 0 ? messageCursor(messages[messages.length - 1]) : after ?? null,
    serverTime: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}, { authenticate: false });
