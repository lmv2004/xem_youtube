import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { log } from "@/lib/logger";
import { withRequestLog } from "@/lib/api-route";
import { generateRoomCode } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE = "api:rooms";

const createSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  video: z.object({
    videoId: z.string().trim().min(1).max(32),
    title: z.string().trim().min(1).max(300),
    channel: z.string().trim().max(200).default(""),
    thumbnail: z.string().trim().max(600).default(""),
    embedUrl: z.string().trim().min(1).max(600),
    watchUrl: z.string().trim().min(1).max(600),
    duration: z.number().int().min(0).max(86_400).default(0),
  }),
});

/** Rooms hosted by the signed-in user. */
export const GET = withRequestLog(SCOPE + ".list", async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.room.findMany({
    where: { hostId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: { _count: { select: { messages: true } } },
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      code: r.code,
      title: r.title,
      videoTitle: r.videoTitle,
      thumbnail: r.thumbnail,
      messageCount: r._count.messages,
      updatedAt: r.updatedAt,
    })),
  });
});

export const POST = withRequestLog(SCOPE + ".create", async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Bạn cần đăng nhập để tạo phòng." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    log.warn(SCOPE + ".create", "zod validation failed", {
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
    return NextResponse.json({ message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const { video } = parsed.data;
  const title = parsed.data.title?.trim() || video.title.slice(0, 80);

  // Codes are short, so collisions are possible; retry a few times before
  // giving up rather than surfacing a unique-constraint error to the user.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateRoomCode();
    try {
      const created = await prisma.room.create({
        data: {
          code,
          title,
          hostId: session.user.id,
          videoId: video.videoId,
          videoTitle: video.title,
          channel: video.channel,
          thumbnail: video.thumbnail,
          embedUrl: video.embedUrl,
          watchUrl: video.watchUrl,
          duration: video.duration,
          isPlaying: false,
          positionSeconds: 0,
          lastSyncAt: new Date(),
        },
      });

      log.info(SCOPE + ".create", "room created", {
        userId: session.user.id,
        code: created.code,
        videoId: created.videoId,
      });
      return NextResponse.json({ code: created.code }, { status: 201 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const isCollision = message.includes("Unique constraint");
      if (!isCollision) {
        log.error(SCOPE + ".create", "prisma create failed", {
          userId: session.user.id,
          err: message,
        });
        return NextResponse.json({ message: "Không thể tạo phòng." }, { status: 500 });
      }
      log.warn(SCOPE + ".create", "room code collision, retrying", { attempt });
    }
  }

  return NextResponse.json(
    { message: "Không sinh được mã phòng, thử lại giúp mình nhé." },
    { status: 500 },
  );
});
