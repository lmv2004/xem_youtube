import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { prisma } from "../lib/db";
import { RoomEventBus } from "../lib/room-event-bus";
import { serveRoomSocket } from "../lib/room-socket";
import { notifyRoom } from "../lib/room-commands";
import type { RoomEvent } from "../lib/room-protocol";
import { generateRoomCode } from "../lib/rooms";

// Opt-in: creates/deletes only uniquely named fixtures, never existing accounts/rooms.
test("two independent gateways deliver chat, controls, presence and room closure", {
  skip: process.env.ROOM_REALTIME_INTEGRATION !== "1", timeout: 180_000,
}, async () => {
  const users: string[] = [];
  const sockets: WebSocket[] = [];
  const servers: ReturnType<typeof createServer>[] = [];
  const wss: WebSocketServer[] = [];
  let code = "";
  const capture = (socket: WebSocket) => {
    const events: RoomEvent[] = [];
    const waiters = new Set<() => void>();
    socket.on("message", (raw) => { events.push(JSON.parse(raw.toString())); for (const wake of waiters) wake(); });
    return {
      wait(predicate: (event: RoomEvent) => boolean) {
        return new Promise<RoomEvent>((resolve, reject) => {
          const check = () => { const index = events.findIndex(predicate); if (index >= 0) { clearTimeout(timer); waiters.delete(check); resolve(events.splice(index, 1)[0]); } };
          const timer = setTimeout(() => { waiters.delete(check); reject(new Error("Expected websocket event did not arrive")); }, 10_000);
          waiters.add(check); check();
        });
      },
    };
  };
  try {
    const user = await prisma.user.create({ data: { name: "Realtime integration", email: `room-ws-${crypto.randomUUID()}@example.invalid` } });
    users.push(user.id);
    code = generateRoomCode();
    const room = await prisma.room.create({ data: { code, title: "Disposable websocket integration", hostId: user.id,
      videoId: "dQw4w9WgXcQ", videoTitle: "QA", channel: "", thumbnail: "", embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", watchUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } });
    const connect = async (host: boolean, clientId: string) => {
      // Each gateway owns a separate LISTEN connection, like separate Vercel instances.
      const bus = new RoomEventBus();
      const server = createServer(); servers.push(server);
      const gateway = new WebSocketServer({ server, maxPayload: 16_384 }); wss.push(gateway);
      gateway.on("connection", (socket) => { void serveRoomSocket(socket, code, clientId, host ? "Host" : "Guest", host ? { id: user.id } : {}, 240_000, bus); });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address(); assert.ok(address && typeof address !== "string");
      const socket = new WebSocket(`ws://127.0.0.1:${address.port}`); sockets.push(socket);
      const observer = capture(socket);
      await observer.wait((event) => event.type === "ready");
      return { socket, ...observer };
    };
    const host = await connect(true, "integration-host");
    const guest = await connect(false, "integration-guest");
    const members = await host.wait((event) => event.type === "members" && event.members.length === 2);
    assert.equal(members.type, "members");
    host.socket.send(JSON.stringify({ type: "chat", requestId: "chat-1", body: "Hello over WebSocket" }));
    const chat = await guest.wait((event) => event.type === "chat");
    assert.equal(chat.type === "chat" && chat.message.body, "Hello over WebSocket");
    const ack = await host.wait((event) => event.type === "ack" && event.requestId === "chat-1");
    assert.equal(ack.type === "ack" && ack.ok, true);
    guest.socket.send(JSON.stringify({ type: "chat", requestId: "guest-chat", body: "Denied" }));
    const deniedChat = await guest.wait((event) => event.type === "ack" && event.requestId === "guest-chat");
    assert.equal(deniedChat.type === "ack" && deniedChat.ok, false);
    host.socket.send(JSON.stringify({ type: "playback", requestId: "play", payload: { isPlaying: true, positionSeconds: 12, hostOnlyControl: true } }));
    const playing = await guest.wait((event) => event.type === "playback" && event.update.playback.isPlaying);
    assert.equal(playing.type === "playback" && playing.update.playback.positionSeconds, 12);
    guest.socket.send(JSON.stringify({ type: "playback", requestId: "guest-pause", payload: { isPlaying: false } }));
    const denied = await guest.wait((event) => event.type === "ack" && event.requestId === "guest-pause");
    assert.equal(denied.type === "ack" && denied.ok, false);
    host.socket.send(JSON.stringify({ type: "playback", requestId: "pause", payload: { isPlaying: false, positionSeconds: 14 } }));
    await guest.wait((event) => event.type === "playback" && !event.update.playback.isPlaying);
    assert.equal(await prisma.roomMessage.count({ where: { roomId: room.id } }), 1);
    const command = async (peer: typeof host, payload: Record<string, unknown>) => {
      const requestId = crypto.randomUUID();
      peer.socket.send(JSON.stringify({ ...payload, requestId }));
      const reply = await peer.wait((event) => event.type === "ack" && event.requestId === requestId);
      assert.equal(reply.type, "ack");
      return reply as Extract<RoomEvent, { type: "ack" }>;
    };
    const video = { videoId: "aqz-KE-bpKQ", title: "Queued video", channel: "QA", thumbnail: "",
      embedUrl: "https://www.youtube.com/embed/aqz-KE-bpKQ", watchUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", duration: 100 };
    assert.equal((await command(guest, { type: "queue", payload: { action: "add", video } })).ok, false);
    await command(host, { type: "queue", payload: { action: "add", video } });
    await command(host, { type: "queue", payload: { action: "add", video } });
    const queued = await guest.wait((event) => event.type === "playback" && event.update.queue.length === 2);
    assert.ok(queued.type === "playback");
    assert.notEqual(queued.update.queue[0].id, queued.update.queue[1].id);
    const generation = queued.update.playbackGeneration;
    assert.equal((await command(guest, { type: "queue", payload: { action: "next", generation } })).ok, false);
    assert.equal((await command(guest, { type: "queue", payload: { action: "remove", id: queued.update.queue[0].id } })).ok, false);
    // Simultaneous requests remove exactly one entry, even when the video IDs match.
    await Promise.all([command(host, { type: "queue", payload: { action: "next", generation } }),
      command(host, { type: "queue", payload: { action: "next", generation } })]);
    let stored = await prisma.room.findUniqueOrThrow({ where: { code } });
    assert.equal(stored.playbackGeneration, generation + 1);
    assert.equal((stored.queue as unknown[]).length, 1);
    assert.equal(stored.videoId, video.videoId);
    assert.equal(stored.isPlaying, true);
    await command(guest, { type: "queue", payload: { action: "ended", generation: stored.playbackGeneration, duration: 1 } });
    assert.equal((await prisma.room.findUniqueOrThrow({ where: { code } })).playbackGeneration, generation + 1, "early end must not skip");
    await command(host, { type: "playback", payload: { isPlaying: true, positionSeconds: 100 } });
    await Promise.all([command(host, { type: "queue", payload: { action: "ended", generation: generation + 1, duration: 100 } }),
      command(guest, { type: "queue", payload: { action: "ended", generation: generation + 1, duration: 100 } })]);
    stored = await prisma.room.findUniqueOrThrow({ where: { code } });
    assert.equal(stored.playbackGeneration, generation + 2);
    assert.equal((stored.queue as unknown[]).length, 0);
    assert.equal(stored.videoId, video.videoId, "consecutive identical videos restart as separate entries");
    assert.equal(stored.positionSeconds, 0);
    await command(host, { type: "queue", payload: { action: "add", video } });
    const toRemove = await prisma.room.findUniqueOrThrow({ where: { code } });
    const entry = (toRemove.queue as { id: string }[])[0];
    await command(host, { type: "queue", payload: { action: "remove", id: entry.id } });
    await command(host, { type: "playback", payload: { isPlaying: true, positionSeconds: 100 } });
    // A viewer may finish the queue without the host, even in a locked room.
    await command(guest, { type: "queue", payload: { action: "ended", generation: generation + 2, duration: 100 } });
    stored = await prisma.room.findUniqueOrThrow({ where: { code } });
    assert.equal(stored.isPlaying, false);
    assert.equal((stored.queue as unknown[]).length, 0);
    await prisma.$transaction(async (tx) => {
      await tx.room.delete({ where: { code } });
      await notifyRoom(tx, { code, kind: "closed" });
    });
    await Promise.all([host.wait((event) => event.type === "closed"), guest.wait((event) => event.type === "closed")]);
    assert.equal(await prisma.roomPresence.count({ where: { roomId: room.id } }), 0);
  } finally {
    for (const socket of sockets) socket.terminate();
    for (const gateway of wss) for (const peer of gateway.clients) peer.terminate();
    await Promise.all(servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
    for (const id of users) await prisma.user.deleteMany({ where: { id } });
    await prisma.$disconnect();
  }
});
