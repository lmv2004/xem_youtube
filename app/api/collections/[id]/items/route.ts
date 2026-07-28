import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { videoItemToRecord } from "@/lib/utils";
import { log } from "@/lib/logger";
import { withRequestLog } from "@/lib/api-route";

const videoItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  channel: z.string().min(1),
  thumbnail: z.string(),
  durationSeconds: z.number().int().nonnegative().default(0),
  viewCount: z.number().int().nonnegative().default(0),
  embedUrl: z.string().url(),
  watchUrl: z.string().url(),
  publishedAt: z.string().optional(),
  description: z.string().optional(),
});

const addItemSchema = z.object({ item: videoItemSchema });

export const GET = withRequestLog("api:collections.items", async (_request, ctx) => {
  const { id } = (await ctx.params) as { id: string };
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const owned = await prisma.collection.findFirst({ where: { id, userId: session.user.id } });
  if (!owned) return NextResponse.json({ message: "Not found" }, { status: 404 });
  const items = await prisma.collectionItem.findMany({
    where: { collectionId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
});

export const POST = withRequestLog("api:collections.items.add", async (request, ctx) => {
  const { id } = (await ctx.params) as { id: string };
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const owned = await prisma.collection.findFirst({ where: { id, userId: session.user.id } });
  if (!owned) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const rawBody = await request.json().catch(() => null);
  const parsed = addItemSchema.safeParse(rawBody);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    log.warn("api:collections.items.add", "zod validation failed", {
      collectionId: id,
      userId: session.user.id,
      issues: issues.map((i) => ({ path: i.path.join("."), code: i.code, message: i.message })),
      receivedKeys: rawBody && typeof rawBody === "object" ? Object.keys(rawBody) : null,
    });
    return NextResponse.json(
      { message: issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      { status: 400 },
    );
  }

  const item = parsed.data.item;
  const record = videoItemToRecord({
    id: item.id,
    title: item.title,
    channel: item.channel,
    thumbnail: item.thumbnail,
    durationSeconds: item.durationSeconds,
    viewCount: item.viewCount,
    embedUrl: item.embedUrl,
    watchUrl: item.watchUrl,
    publishedAt: item.publishedAt ?? "",
    description: item.description ?? "",
  });

  try {
    const created = await prisma.collectionItem.upsert({
      where: { collectionId_videoId: { collectionId: id, videoId: record.videoId } },
      create: { collectionId: id, ...record },
      update: {},
    });
    log.info("api:collections.items.add", "item saved", {
      collectionId: id,
      userId: session.user.id,
      videoId: record.videoId,
    });
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (err: unknown) {
    log.error("api:collections.items.add", "prisma upsert failed", {
      collectionId: id,
      userId: session.user.id,
      videoId: record.videoId,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { message: "Không thể lưu video. Vui lòng thử lại." },
      { status: 500 },
    );
  }
});
