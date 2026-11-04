import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { normalizeRoomCode } from "@/lib/rooms";
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
  const room = await prisma.room.findUnique({
    where: { code },
    select: { id: true, hostId: true },
  });
  if (!room) {
    return Response.json({ message: "Phòng không tồn tại." }, { status: 404 });
  }

  const stage = getStageState(code);
  return Response.json(stage, {
    headers: { "Cache-Control": "no-store" },
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

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Dữ liệu JSON không hợp lệ." }, { status: 400 });
  }

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

  switch (action) {
    case "toggle": {
      const enabled = Boolean(body.enabled);
      const hostActor = body.clientId
        ? {
            clientId: String(body.clientId),
            userId: session?.user?.id ?? null,
            name: session?.user?.name || "Chủ phòng",
            image: session?.user?.image || null,
          }
        : undefined;
      const state = toggleStage(code, enabled, hostActor);
      return Response.json(state);
    }

    case "set_limit": {
      const maxParticipants = Number(body.maxParticipants) || 6;
      const state = setStageLimit(code, maxParticipants);
      return Response.json(state);
    }

    case "request_join": {
      const clientId = String(body.clientId || "").trim();
      const catId = String(body.catId || "").trim();
      const catGifUrl = String(body.catGifUrl || "").trim();
      const catName = String(body.catName || "Mèo Nhảy").trim();
      const name = String(body.name || session?.user?.name || "Khán giả").trim();
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
}
