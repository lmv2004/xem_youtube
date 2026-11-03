import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVideoById, getRelatedVideos } from "@/lib/youtube";
import { normalizeRoomCode } from "@/lib/rooms";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: {
    params: Promise<{
        code: string;
    }>;
}) {
    const { code } = await context.params;
    const room = await prisma.room.findUnique({ where: { code: normalizeRoomCode(code) }, select: { videoId: true } });
    if (!room)
        return NextResponse.json({ items: [] }, { status: 404 });
    try {
        const video = await getVideoById(room.videoId);
        return NextResponse.json({ videoId: room.videoId, items: video ? await getRelatedVideos(video, 8) : [] });
    }
    catch {
        return NextResponse.json({ items: [] }, { status: 503 });
    }
}
