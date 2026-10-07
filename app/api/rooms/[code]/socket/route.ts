import { experimental_upgradeWebSocket } from "@vercel/functions";
import { auth } from "@/auth";
import { normalizeRoomCode } from "@/lib/rooms";
import { serveRoomSocket } from "@/lib/room-socket";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const url = new URL(request.url);
  // Cookies authenticate the upgrade; reject cross-origin WebSocket hijacking.
  if (request.headers.get("origin") !== url.origin) return new Response("Forbidden", { status: 403 });
  const code = normalizeRoomCode((await context.params).code);
  const clientId = url.searchParams.get("clientId") ?? "";
  const name = url.searchParams.get("name") ?? "Khách";
  if (!/^[A-Z2-9]{6}$/.test(code) || !/^[a-zA-Z0-9-]{8,64}$/.test(clientId) || name.length > 60) {
    return new Response("Invalid room connection", { status: 400 });
  }
  const session = await auth();
  const lifetime = session?.expires ? Date.parse(session.expires) - Date.now() : 240_000;
  if (lifetime <= 0) return new Response("Session expired", { status: 401 });
  return experimental_upgradeWebSocket(async (socket) => {
    // Keep the invocation active while event callbacks perform asynchronous DB work.
    // The socket is already upgraded; clients need not wait for this handler to return.
    const closed = new Promise<void>((resolve) => socket.once("close", () => resolve()));
    await serveRoomSocket(socket, code, clientId, name, session?.user ?? {}, lifetime);
    await closed;
  }, { maxPayload: 16_384 });
}
