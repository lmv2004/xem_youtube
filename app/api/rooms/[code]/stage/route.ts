import { cookies } from "next/headers";
import { z } from "zod";
import { readStage, mutateStage } from "@/lib/room-stage-store";
import { verifyRoomClientToken } from "@/lib/room-client-token";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { normalizeRoomCode, PRESENCE_TIMEOUT_MS } from "@/lib/rooms";
import { isSameOriginRequest } from "@/lib/request-origin";
import {
  getStageState,
  toggleStage,
  setStageLimit,
  requestStageJoin,
  cancelStageRequest,
  approveStageRequest,
  rejectStageRequest,
  approveAllStageRequests,
  leaveStage,
  clearStage,
} from "@/lib/room-stage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const code = normalizeRoomCode((await context.params).code);
  if (!code) {
    return Response.json({ message: "Mã phòng không hợp lệ." }, { status: 400 });
  }

  const stage = await readStage(code);
  if (!stage) return Response.json({ message: "Phòng không tồn tại." }, { status: 404 });
  return Response.json(stage, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ message: "Nguồn gửi không hợp lệ." }, { status: 403 });
  }

  const code = normalizeRoomCode((await context.params).code);
  const room = await prisma.room.findUnique({
    where: { code },
    select: { id: true, hostId: true },
  });
  if (!room) {
    return Response.json({ message: "Phòng không tồn tại." }, { status: 404 });
  }

  const session = await auth();
  const isHost = Boolean(session?.user?.id && session.user.id === room.hostId);

  const parsed = z.object({
    action: z.enum(["toggle", "set_limit", "request_join", "cancel_request", "approve", "reject", "approve_all", "leave", "clear"]),
    clientId: z.string().trim().min(1).max(64).optional(),
    actorClientId: z.string().trim().min(1).max(64),
    clientToken: z.string().length(64),
    userId: z.string().max(200).nullish(),
    enabled: z.boolean().optional(),
    maxParticipants: z.number().int().min(1).max(12).optional(),
    catId: z.string().min(1).max(200).optional(),
    catGifUrl: z.string().url().max(600).refine(url => url.startsWith("https://")).optional(),
    catName: z.string().max(100).optional(),
    name: z.string().trim().min(1).max(60).optional(),
    image: z.string().url().max(600).nullish(),
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Dữ liệu không hợp lệ." }, { status: 400 });
  const body = parsed.data;
  const ownerKey = (await cookies()).get("xem_room_owner")?.value;
  const owners = await prisma.$queryRaw<{ ownerKey: string | null }[]>`SELECT "ownerKey" FROM "RoomPresence" WHERE "roomId" = ${room.id} AND "clientId" = ${body.actorClientId}`;
  if (!ownerKey || owners[0]?.ownerKey !== ownerKey || !verifyRoomClientToken(room.id, body.actorClientId, ownerKey, body.clientToken))
    return Response.json({ message: "Bạn cần tham gia phòng trước." }, { status: 403 });
  const presence = await prisma.roomPresence.findUnique({ where: { roomId_clientId: { roomId: room.id, clientId: body.actorClientId } } });
  if (!presence || presence.lastSeenAt.getTime() < Date.now() - PRESENCE_TIMEOUT_MS || (presence.userId && presence.userId !== session?.user?.id))
    return Response.json({ message: "Bạn cần tham gia phòng trước." }, { status: 403 });
  if (!isHost && ["request_join", "cancel_request", "leave"].includes(body.action) && body.clientId !== body.actorClientId)
    return Response.json({ message: "Bạn chỉ được thao tác cho chính mình." }, { status: 403 });

  const action = body?.action;

  // Host-only checks
  if (["toggle", "set_limit", "approve", "reject", "approve_all", "clear"].includes(action)) {
    if (!isHost) {
      return Response.json(
        { message: "Chỉ chủ phòng mới có quyền thực hiện hành động này." },
        { status: 403 },
      );
    }
  }

  return mutateStage(code, () => {
    switch (action) {
      case "toggle": {
        if (body.enabled === undefined) return Response.json({ message: "Thiếu trạng thái." }, { status: 400 });
        const enabled = body.enabled;
        const hostActor = body.clientId
          ? {
              clientId: String(body.clientId),
              userId: session?.user?.id ?? null,
              name: presence.name,
              image: session?.user?.image || null,
            }
          : undefined;
        const state = toggleStage(code, enabled, hostActor);
        return Response.json(state);
      }

      case "set_limit": {
        if (body.maxParticipants === undefined) return Response.json({ message: "Thiếu giới hạn sân khấu." }, { status: 400 });
        const maxParticipants = Number(body.maxParticipants) || 6;
        const state = setStageLimit(code, maxParticipants);
        return Response.json(state);
      }

      case "request_join": {
        if (!getStageState(code).enabled) return Response.json({ message: "Sân khấu chưa mở." }, { status: 409 });
        const clientId = String(body.clientId || "").trim();
        const catId = String(body.catId || "").trim();
        const catGifUrl = String(body.catGifUrl || "").trim();
        const catName = String(body.catName || "Mèo Nhảy").trim();
        const name = String(presence.name || "Khán giả").trim();
        const image = session?.user?.image || body.image || null;

        if (!clientId || !catId || !catGifUrl) {
          return Response.json({ message: "Thiếu thông tin người tham gia hoặc meme mèo." }, { status: 400 });
        }

        const state = requestStageJoin(
          code,
          {
            clientId,
            userId: session?.user?.id ?? null,
            name,
            image,
            isHost,
            catId,
            catGifUrl,
            catName,
          },
          isHost,
        );
        return Response.json(state);
      }

      case "cancel_request": {
        const clientId = String(body.clientId || "").trim();
        if (!clientId) return Response.json({ message: "Thiếu clientId." }, { status: 400 });
        const state = cancelStageRequest(code, {
          clientId,
          userId: session?.user?.id ?? null,
        });
        return Response.json(state);
      }

      case "approve": {
        const current = getStageState(code);
        if (!current.enabled || current.participants.length >= current.maxParticipants) return Response.json({ message: "Sân khấu chưa mở hoặc đã đầy." }, { status: 409 });
        const clientId = String(body.clientId || "").trim();
        const userId = body.userId ? String(body.userId).trim() : null;
        if (!clientId) return Response.json({ message: "Thiếu clientId." }, { status: 400 });
        const state = approveStageRequest(code, { clientId, userId });
        return Response.json(state);
      }

      case "reject": {
        const clientId = String(body.clientId || "").trim();
        const userId = body.userId ? String(body.userId).trim() : null;
        if (!clientId) return Response.json({ message: "Thiếu clientId." }, { status: 400 });
        const state = rejectStageRequest(code, { clientId, userId });
        return Response.json(state);
      }

      case "approve_all": {
        const state = approveAllStageRequests(code);
        return Response.json(state);
      }

      case "leave": {
        const targetClientId = String(body.clientId || "").trim();
        if (!targetClientId) return Response.json({ message: "Thiếu clientId." }, { status: 400 });
        // Can leave if self or host kicking
        const state = leaveStage(code, {
          clientId: targetClientId,
          userId: isHost ? null : (session?.user?.id ?? null),
        });
        return Response.json(state);
      }

      case "clear": {
        const state = clearStage(code);
        return Response.json(state);
      }

      default:
        return Response.json({ message: "Hành động không hợp lệ." }, { status: 400 });
    }
  });
}
