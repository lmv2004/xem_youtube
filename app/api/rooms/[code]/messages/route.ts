import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";
import { withRequestLog } from "@/lib/api-route";
import { MAX_MESSAGE_LENGTH, normalizeRoomCode } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE = "api:rooms.messages";

const createSchema = z.object({
  body: z.string().trim().min(1, "Tin nhắn trống.").max(MAX_MESSAGE_LENGTH),
});

/** Watching is open to everyone, but posting requires an account. */
export const POST = withRequestLog(SCOPE + ".create", async (request, context) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Bạn cần đăng nhập để chat." },
      { status: 401 },
    );
  }

  const params = await context.params;
  const raw = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = normalizeRoomCode(raw ?? "");

  const room = await prisma.room.findUnique({ where: { code }, select: { id: true } });
  if (!room) {
    return NextResponse.json({ message: "Phòng không tồn tại." }, { status: 404 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      { status: 400 },
    );
  }

  const created = await prisma.roomMessage.create({
    data: { roomId: room.id, userId: session.user.id, body: parsed.data.body },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  log.info(SCOPE + ".create", "message posted", {
    userId: session.user.id,
    code,
    messageId: created.id,
  });

  return NextResponse.json(
    {
      message: {
        id: created.id,
        body: created.body,
        createdAt: created.createdAt.toISOString(),
        author: created.user,
      },
    },
    { status: 201 },
  );
});
