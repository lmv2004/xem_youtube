import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { videoItemToRecord } from "@/lib/utils";
import { withRequestLog } from "@/lib/api-route";

const schema = z.object({
  item: z.object({
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
  }),
  topic: z.string().max(120).optional(),
});

export const GET = withRequestLog("api:history.list", async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const items = await prisma.viewHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ items });
});

export const POST = withRequestLog("api:history.add", async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  const record = videoItemToRecord({
    id: parsed.data.item.id,
    title: parsed.data.item.title,
    channel: parsed.data.item.channel,
    thumbnail: parsed.data.item.thumbnail,
    durationSeconds: parsed.data.item.durationSeconds,
    viewCount: parsed.data.item.viewCount,
    embedUrl: parsed.data.item.embedUrl,
    watchUrl: parsed.data.item.watchUrl,
    publishedAt: parsed.data.item.publishedAt ?? "",
    description: parsed.data.item.description ?? "",
  });
  const created = await prisma.viewHistory.create({
    data: { userId: session.user.id, ...record, topic: parsed.data.topic ?? null },
  });
  return NextResponse.json({ id: created.id }, { status: 201 });
});
