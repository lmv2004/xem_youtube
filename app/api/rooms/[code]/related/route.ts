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
    const url = new URL(_request.url);
    const offset = Number(url.searchParams.get("offset") ?? "0");
    if (!Number.isInteger(offset) || offset < 0 || offset > 40)
        return NextResponse.json({ items: [] }, { status: 400 });
    const room = await prisma.room.findUnique({ where: { code: normalizeRoomCode(code) }, select: { videoId: true } });
    if (!room)
        return NextResponse.json({ items: [] }, { status: 404 });
    try {
        const video = await getVideoById(room.videoId);
        const items = video ? await getRelatedVideos(video, 40) : [];
        const end = offset + 8;
        return NextResponse.json({ videoId: room.videoId, items: items.slice(offset, end), nextOffset: end < items.length ? end : null });
    }
    catch {
        return NextResponse.json({ items: [] }, { status: 503 });
    }
}
