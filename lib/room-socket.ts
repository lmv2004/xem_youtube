import type { WebSocket } from "ws";
import { prisma } from "./db";
import { roomEventBus } from "./room-event-bus";
import { notifyRoom, postRoomMessage, updatePlayback, updateQueue, RoomCommandError, type RoomActor } from "./room-commands";
import { roomCommand, type RoomEvent } from "./room-protocol";
import { PRESENCE_TIMEOUT_MS, sanitizeDisplayName } from "./rooms";

export async function serveRoomSocket(socket: WebSocket, code: string, clientId: string, displayName: string,
  actor: RoomActor, lifetimeMs = 240_000, bus = roomEventBus) {
  let disposed = false;
  let unsubscribe: (() => void) | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let expiry: ReturnType<typeof setTimeout> | undefined;
  let roomId: string | undefined;
  let presenceId: string | undefined;
  let windowStart = Date.now();
  let windowCommands = 0;
  let lastPong = Date.now();
  let renewing = false;
  let queued = 0;
  let commands = Promise.resolve();
  const send = (event: RoomEvent) => {
    if (socket.readyState !== 1) return;
    if (socket.bufferedAmount > 256_000) { socket.close(1013, "Slow connection"); return; }
    socket.send(JSON.stringify(event));
  };
  const leave = async () => {
    if (!presenceId) return;
    await prisma.$transaction(async (tx) => {
      const removed = await tx.roomPresence.deleteMany({ where: { id: presenceId } });
      if (removed.count) await notifyRoom(tx, { code, kind: "members" });
    });
  };
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    clearInterval(timer); clearTimeout(expiry);
    unsubscribe?.();
    void leave().catch(() => {});
  };
  socket.once("close", cleanup);
  socket.on("error", cleanup);
  socket.on("pong", () => { lastPong = Date.now(); });
  try {
    // Subscribe before joining/snapshot so the bootstrap cannot miss a mutation.
    unsubscribe = await bus.subscribe(code, {
      receive(event) { send(event); if (event.type === "closed") socket.close(1000, "Room closed"); },
      disconnected() { socket.close(1012, "Event connection lost"); },
    });
    if (disposed) { unsubscribe(); return; }
    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) { send({ type: "closed" }); socket.close(1000, "Room closed"); return; }
    roomId = room.id;
    await prisma.$transaction(async (tx) => {
      const existing = await tx.roomPresence.findUnique({ where: { roomId_clientId: { roomId: room.id, clientId } } });
      if (existing?.userId && existing.userId !== actor.id) throw new RoomCommandError(403, "Connection belongs to another account");
      const data = { userId: actor.id ?? null, name: sanitizeDisplayName(displayName) || "Khách", image: actor.image ?? null, lastSeenAt: new Date() };
      await tx.roomPresence.deleteMany({ where: { roomId: room.id, clientId } });
      const joined = await tx.roomPresence.create({ data: { roomId: room.id, clientId, ...data } });
      presenceId = joined.id;
      await notifyRoom(tx, { code, kind: "members" });
    });
    if (disposed) { await leave(); return; }
    socket.on("message", (raw, binary) => {
      if (disposed) return;
      if (Date.now() - windowStart > 10_000) { windowStart = Date.now(); windowCommands = 0; }
      if (++windowCommands > 30) { socket.close(1008, "Rate limit"); return; }
      if (binary || ++queued > 20) { socket.close(1008, "Too many commands"); return; }
      let json: unknown;
      try { json = JSON.parse(raw.toString()); } catch { socket.close(1008, "Invalid JSON"); return; }
      const parsed = roomCommand.safeParse(json);
      if (!parsed.success) { socket.close(1008, "Invalid command"); return; }
      const command = parsed.data;
      commands = commands.then(async () => {
        if (disposed) return;
        try {
          const data = command.type === "chat"
            ? await postRoomMessage(code, actor, command.body)
            : command.type === "queue" ? await updateQueue(code, clientId, actor, command.payload)
            : await updatePlayback(code, clientId, actor, command.payload);
          send({ type: "ack", requestId: command.requestId, ok: true, data });
        } catch (error) {
          send({ type: "ack", requestId: command.requestId, ok: false,
            message: error instanceof RoomCommandError ? error.message : "Không thể cập nhật phòng. Vui lòng thử lại." });
          if (error instanceof RoomCommandError && error.status === 404) { send({ type: "closed" }); socket.close(1000); }
        } finally { queued--; }
      });
    });
    // Browser WebSockets answer protocol ping automatically, even in background tabs.
    timer = setInterval(() => {
      if (Date.now() - lastPong > 60_000) { socket.terminate(); return; }
      socket.ping();
      if (renewing || disposed) return;
      renewing = true;
      void prisma.$transaction(async (tx) => {
        const alive = await tx.roomPresence.updateMany({ where: { id: presenceId }, data: { lastSeenAt: new Date() } });
        if (!alive.count) { socket.close(1012, "Rejoin required"); return; }
        const expired = await tx.roomPresence.deleteMany({ where: { roomId, lastSeenAt: { lt: new Date(Date.now() - PRESENCE_TIMEOUT_MS) } } });
        if (expired.count) await notifyRoom(tx, { code, kind: "members" });
      }).catch(() => socket.close(1012, "Presence unavailable")).finally(() => { renewing = false; });
    }, 25_000);
    expiry = setTimeout(() => socket.close(1012, "Reconnect"), Math.max(1000, Math.min(240_000, lifetimeMs)));
    send({ type: "ready", serverTime: new Date().toISOString() });
  } catch {
    socket.close(1011, "Room connection unavailable");
    cleanup();
  }
}
