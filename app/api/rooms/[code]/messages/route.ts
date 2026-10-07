import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { withRequestLog } from "@/lib/api-route";
import { normalizeRoomCode } from "@/lib/rooms";
import { postRoomMessage, RoomCommandError } from "@/lib/room-commands";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = withRequestLog("api:rooms.messages", async (request, context) => {
  const session = await auth();
  const params = await context.params;
  const code = normalizeRoomCode(String(params.code ?? ""));
  const body = await request.json().catch(() => null);
  try {
    const message = await postRoomMessage(code, session?.user ?? {}, typeof body?.body === "string" ? body.body : "");
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof RoomCommandError) return NextResponse.json({ message: error.message }, { status: error.status });
    throw error;
  }
}, { authenticate: false });
