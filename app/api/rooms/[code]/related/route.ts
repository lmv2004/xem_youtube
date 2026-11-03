import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVideoById, getRelatedVideos } from "@/lib/youtube";
import { normalizeRoomCode } from "@/lib/rooms";
import type { VideoItem } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getFallbackVideos(excludeId: string): Promise<VideoItem[]> {
  try {
    const rooms = await prisma.room.findMany({
      where: { videoId: { not: excludeId } },
      orderBy: { updatedAt: "desc" },
      take: 24,
      select: {
        videoId: true,
        videoTitle: true,
        channel: true,
        thumbnail: true,
        embedUrl: true,
        watchUrl: true,
        duration: true,
      },
    });
    return rooms.map((r) => ({
      id: r.videoId,
      title: r.videoTitle,
      channel: r.channel,
      description: "",
      thumbnail: r.thumbnail,
      embedUrl: r.embedUrl,
      watchUrl: r.watchUrl,
      durationSeconds: r.duration,
      viewCount: 0,
      publishedAt: "",
      embeddable: true,
    }));
  } catch {
    return [];
  }
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      code: string;
    }>;
  },
) {
  const { code } = await context.params;
  const url = new URL(_request.url);
  const offset = Number(url.searchParams.get("offset") ?? "0");
  if (!Number.isInteger(offset) || offset < 0 || offset > 40)
    return NextResponse.json({ items: [] }, { status: 400 });
  const room = await prisma.room.findUnique({
    where: { code: normalizeRoomCode(code) },
    select: { videoId: true },
  });
  if (!room) return NextResponse.json({ items: [] }, { status: 404 });

  try {
    const video = await getVideoById(room.videoId);
    let items = video ? await getRelatedVideos(video, 40) : [];
    if (!items.length) {
      items = await getFallbackVideos(room.videoId);
    }
    const end = offset + 8;
    return NextResponse.json({
      videoId: room.videoId,
      items: items.slice(offset, end),
      nextOffset: end < items.length ? end : null,
    });
  } catch (err) {
    console.error("[related/route] catch error:", err);
    const items = await getFallbackVideos(room.videoId);
    const end = offset + 8;
    return NextResponse.json({
      videoId: room.videoId,
      items: items.slice(offset, end),
      nextOffset: end < items.length ? end : null,
    });
  }
}
