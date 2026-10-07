import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";
import { generateRoomCode, type RoomSyncResponse } from "../lib/rooms";

after(async () => { await prisma.$disconnect(); });

test("HTTP viewers join, chat, control, reorder and recover presence without sockets", {
  skip: process.env.ROOM_HTTP_INTEGRATION !== "1", timeout: 120_000,
}, async () => {
  const email = `room-http-${crypto.randomUUID()}@example.invalid`;
  const password = "test-only-password";
  const user = await prisma.user.create({ data: {
    name: "HTTP integration", email, passwordHash: await bcrypt.hash(password, 4),
  } });
  const portServer = createServer();
  await new Promise<void>((resolve) => portServer.listen(0, "127.0.0.1", resolve));
  const address = portServer.address();
  assert.ok(address && typeof address !== "string");
  await new Promise<void>((resolve) => portServer.close(() => resolve()));
  const origin = `http://localhost:${address.port}`;
  let output = "";
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(address.port)], {
    windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production", AUTH_URL: origin, AUTH_TRUST_HOST: "true",
      AUTH_SECRET: "http-integration-test-only-secret-32-bytes" },
  });
  server.stdout.on("data", (data) => { output = (output + data).slice(-4000); });
  server.stderr.on("data", (data) => { output = (output + data).slice(-4000); });
  const exited = new Promise<void>((resolve) => server.once("exit", () => resolve()));
  try {
    let started = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (server.exitCode !== null) throw new Error(`Next server exited: ${output}`);
      try {
        const response = await fetch(`${origin}/api/auth/csrf`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) { started = true; break; }
      } catch { /* Wait for the production server to listen. */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(started, `Next server failed to start: ${output}`);
    const cookies = new Map<string, string>();
    const rememberCookies = (response: Response) => {
      for (const cookie of response.headers.getSetCookie()) {
        const value = cookie.split(";", 1)[0];
        cookies.set(value.slice(0, value.indexOf("=")), value);
      }
    };
    const csrf = await fetch(`${origin}/api/auth/csrf`);
    rememberCookies(csrf);
    const { csrfToken } = await csrf.json() as { csrfToken: string };
    const login = await fetch(`${origin}/api/auth/callback/credentials`, {
      method: "POST", redirect: "manual", headers: {
        "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1",
        Cookie: [...cookies.values()].join("; "), Origin: origin,
      }, body: new URLSearchParams({ csrfToken, email, password, callbackUrl: origin }),
    });
    assert.equal(login.status, 200);
    rememberCookies(login);
    const hostCookie = [...cookies.values()].join("; ");
    const session = await fetch(`${origin}/api/auth/session`, { headers: { Cookie: hostCookie } });
    assert.equal((await session.json()).user?.id, user.id);

    const code = generateRoomCode();
    const room = await prisma.room.create({ data: {
      code, title: "Disposable HTTP room", hostId: user.id, videoId: "dQw4w9WgXcQ", videoTitle: "QA",
      channel: "", thumbnail: "", embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      watchUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    } });
    const hostId = crypto.randomUUID();
    const guestId = crypto.randomUUID();
    const post = (path: string, body: unknown, host = false) => fetch(`${origin}/api/rooms/${code}/${path}`, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: origin,
        ...(host ? { Cookie: hostCookie } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
    });
    const sync = async (host: boolean, heartbeat = false, after?: string | null) => {
      const response = await post("sync", { clientId: host ? hostId : guestId, displayName: host ? "Host" : "Guest", heartbeat, after }, host);
      assert.equal(response.status, 200);
      return await response.json() as RoomSyncResponse;
    };
    const command = (host: boolean, data: unknown) => post("commands", { clientId: host ? hostId : guestId, command: data }, host);
    await sync(true, true);
    const joined = await sync(false, true);
    assert.equal(joined.members.length, 2);
    assert.ok(joined.members.some((member) => member.clientId === hostId && member.isHost));
    assert.equal((await command(false, { type: "chat", requestId: "guest-chat", body: "no account" })).status, 401);
    const messageId = crypto.randomUUID();
    const chat = { type: "chat", requestId: messageId, messageId, body: "HTTP chat" };
    assert.equal((await command(true, chat)).status, 200);
    assert.equal((await command(true, chat)).status, 200);
    assert.equal(await prisma.roomMessage.count({ where: { roomId: room.id } }), 1);
    const chatted = await sync(false);
    assert.equal(chatted.messages.at(-1)?.id, messageId);
    assert.equal((await command(true, { type: "playback", requestId: "play", payload: { isPlaying: true, positionSeconds: 45 } })).status, 200);
    assert.equal((await sync(false)).playback.positionSeconds, 45);
    assert.equal((await command(true, { type: "playback", requestId: "lock", payload: { hostOnlyControl: true } })).status, 200);
    assert.equal((await command(false, { type: "playback", requestId: "blocked", payload: { isPlaying: false } })).status, 403);
    assert.equal((await command(true, { type: "rename", requestId: "rename", title: "Renamed HTTP room" })).status, 200);
    assert.equal((await sync(false)).roomTitle, "Renamed HTTP room");
    const video = { videoId: "dQw4w9WgXcQ", title: "Queued", channel: "", thumbnail: "",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", watchUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 200 };
    const firstId = crypto.randomUUID(), secondId = crypto.randomUUID();
    for (const id of [firstId, secondId])
      assert.equal((await command(true, { type: "queue", requestId: crypto.randomUUID(), payload: { action: "add", id, video } })).status, 200);
    assert.equal((await command(true, { type: "queue", requestId: "move", payload: { action: "move", id: secondId, direction: "up", beforeId: firstId } })).status, 200);
    assert.deepEqual((await sync(false)).queue.map((entry) => entry.id), [secondId, firstId]);
    // Simulate a background tab whose presence expired; heartbeat rejoins without touching playback.
    await prisma.roomPresence.deleteMany({ where: { roomId: room.id, clientId: guestId } });
    const before = await prisma.room.findUniqueOrThrow({ where: { id: room.id } });
    const recovered = await sync(false, true, chatted.cursor);
    assert.ok(recovered.members.some((member) => member.clientId === guestId));
    assert.equal(recovered.messages.length, 0);
    assert.equal(recovered.playback.lastSyncAt, before.lastSyncAt.toISOString());
    assert.equal(recovered.playback.isPlaying, true);
    const startTime = Date.now();
    await prisma.roomMessage.createMany({ data: Array.from({ length: 51 }, (_, index) => ({
      id: crypto.randomUUID(), roomId: room.id, userId: user.id, body: `missed-${index}`,
      createdAt: new Date(startTime + index),
    })) });
    const firstPage = await sync(false, false, chatted.cursor);
    assert.equal(firstPage.messages.length, 50);
    assert.equal(firstPage.messages[0].body, "missed-0");
    const secondPage = await sync(false, false, firstPage.cursor);
    assert.deepEqual(secondPage.messages.map((message) => message.body), ["missed-50"]);
    const deleted = await fetch(`${origin}/api/rooms/${code}`, { method: "DELETE", headers: { Cookie: hostCookie, Origin: origin } });
    assert.equal(deleted.status, 200);
    assert.equal((await post("sync", { clientId: guestId, displayName: "Guest", heartbeat: false })).status, 404);
  } finally {
    server.kill();
    await exited;
    await prisma.user.deleteMany({ where: { id: user.id } });
  }
});
