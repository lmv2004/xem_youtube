import { auth } from "@/auth";
import { roomCommand } from "@/lib/room-protocol";
import { normalizeRoomCode } from "@/lib/rooms";
import { postRoomMessage, updatePlayback, updateQueue, RoomCommandError } from "@/lib/room-commands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mutations use ordinary request/response acknowledgement. Room events are
// still pushed over the existing WebSocket; this endpoint is never polled.
export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ message: "Nguồn gửi không hợp lệ." }, { status: 403 });
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > 16_384) {
    return Response.json({ message: "Dữ liệu quá lớn." }, { status: 413 });
  }
  let body: { clientId?: unknown; command?: unknown };
  try { body = JSON.parse(text); } catch { return Response.json({ message: "Dữ liệu không hợp lệ." }, { status: 400 }); }
  const parsed = roomCommand.safeParse(body?.command);
  if (!parsed.success || typeof body?.clientId !== "string" || !/^[a-zA-Z0-9-]{8,64}$/.test(body.clientId)) {
    return Response.json({ message: "Lệnh không hợp lệ." }, { status: 400 });
  }
  const session = await auth();
  const actor = session?.user ?? {};
  const code = normalizeRoomCode((await context.params).code);
  const command = parsed.data;
  try {
    const data = command.type === "chat" ? await postRoomMessage(code, actor, command.body)
      : command.type === "queue" ? await updateQueue(code, body.clientId, actor, command.payload)
      : await updatePlayback(code, body.clientId, actor, command.payload);
    return Response.json({ data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RoomCommandError) return Response.json({ message: error.message }, { status: error.status });
    return Response.json({ message: "Không cập nhật được phòng. Vui lòng thử lại." }, { status: 500 });
  }
}
