import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { roomClientToken } from "@/lib/room-client-token";
import { readRoomSnapshot } from "@/lib/room-snapshot";
import { pauseEmptyRoom } from "@/lib/room-idle";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { withRequestLog } from "@/lib/api-route";
import {
  PRESENCE_TIMEOUT_MS,
  normalizeRoomCode,
  sanitizeDisplayName,
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

  let room = await prisma.room.findUnique({ where: { code } });
  if (!room) {
    return NextResponse.json({ message: "Phòng không tồn tại." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const proposedOwner = request.headers.get("x-room-owner") ?? "";
  const ownerKey = cookieStore.get("xem_room_owner")?.value || (/^[a-zA-Z0-9-]{32,64}$/.test(proposedOwner) ? proposedOwner : randomUUID());
  const existing = await prisma.$queryRaw<{ ownerKey: string | null }[]>`SELECT "ownerKey" FROM "RoomPresence" WHERE "roomId" = ${room.id} AND "clientId" = ${clientId}`;
  if (existing[0]?.ownerKey && existing[0].ownerKey !== ownerKey)
    return NextResponse.json({ message: "Mã phiên phòng đã được sử dụng ở cửa sổ khác." }, { status: 409 });
  if (parsed.data.heartbeat) {
    const session = await auth();

    // Ordinary state polls stay read-only; authenticate/write on heartbeats only.
    try {
      const renewed = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Room" WHERE code = ${code} FOR UPDATE`;
        const current = await tx.room.findUnique({ where: { code } });
        if (!current) return null;
        const presence = await tx.roomPresence.findUnique({
          where: { roomId_clientId: { roomId: current.id, clientId } },
          select: { ownerKey: true },
        });
        if (presence?.ownerKey && presence.ownerKey !== ownerKey) {
          return NextResponse.json({ message: "Mã phiên phòng đã được sử dụng ở cửa sổ khác." }, { status: 409 });
        }
        const heartbeatAt = new Date();
        // A sleeping/reconnecting tab retains its playback. Only a new arrival
        // can settle an abandoned room before its own presence is registered.
        const snapshotRoom = presence ? current : await pauseEmptyRoom(tx, current, heartbeatAt);
        await tx.roomPresence.upsert({
          where: { roomId_clientId: { roomId: current.id, clientId } },
          create: {
            roomId: current.id,
            clientId,
            userId: session?.user?.id ?? null,
            name: displayName,
            image: session?.user?.image ?? null,
            lastSeenAt: heartbeatAt,
          },
          update: {
            lastSeenAt: heartbeatAt,
            name: displayName,
            userId: session?.user?.id ?? null,
            image: session?.user?.image ?? null,
          },
        });
        await tx.$executeRaw`UPDATE "RoomPresence" SET "ownerKey" = COALESCE("ownerKey", ${ownerKey}) WHERE "roomId" = ${current.id} AND "clientId" = ${clientId}`;
        await tx.roomPresence.deleteMany({
          where: {
            roomId: current.id,
            lastSeenAt: { lt: new Date(heartbeatAt.getTime() - PRESENCE_TIMEOUT_MS) },
          },
        });
        return snapshotRoom;
      });
      if (!renewed) {
        return NextResponse.json({ message: "Phòng đã đóng." }, { status: 404 });
      }
      if (renewed instanceof Response) return renewed;
      room = renewed;

    } catch (error) {
      // The host can delete the room while this heartbeat is in flight.
      if (!await prisma.room.findUnique({ where: { code } })) {
        return NextResponse.json({ message: "Phòng đã đóng." }, { status: 404 });
      }
      throw error;
    }

  }

  const payload = await readRoomSnapshot(room, after);

  const response = NextResponse.json({ ...payload, ...(parsed.data.heartbeat ? { clientToken: roomClientToken(room.id, clientId, ownerKey) } : {}) }, {
    headers: { "Cache-Control": "no-store" },
  });
  if (!cookieStore.get("xem_room_owner")) response.cookies.set("xem_room_owner", ownerKey, { httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: 31536000 });
  return response;
}, { authenticate: false });
