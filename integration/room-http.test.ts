import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";
import { generateRoomCode, type RoomSyncResponse } from "../lib/rooms";

after(async () => { await prisma.$disconnect(); });

test("HTTP viewers join, chat, contribute under host control and recover without sockets", {
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
  const origin = `http://127.0.0.1:${address.port}`;
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
    const ownerCookies = { host: "", guest: "" };
    const post = async (path: string, body: unknown, host = false) => {
      const key = host ? "host" : "guest";
      const response = await fetch(`${origin}/api/rooms/${code}/${path}`, {
        method: "POST", headers: { "Content-Type": "application/json", Origin: origin,
          Cookie: [host ? hostCookie : "", ownerCookies[key]].filter(Boolean).join("; ") },
        body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
      });
      const owner = response.headers.getSetCookie().find(value => value.startsWith("xem_room_owner="));
      if (owner) ownerCookies[key] = owner.split(";", 1)[0];
      return response;
    };
    const sync = async (host: boolean, heartbeat = false, after?: string | null) => {
      const response = await post("sync", { clientId: host ? hostId : guestId, displayName: host ? "Host" : "Guest", heartbeat, after }, host);
      assert.equal(response.status, 200);
      return await response.json() as RoomSyncResponse;
    };
    const command = (host: boolean, data: unknown) => post("commands", { clientId: host ? hostId : guestId, command: data }, host);
    const hostJoined = await sync(true, true);
    const joined = await sync(false, true);
    const stageAction = (host: boolean, data: Record<string, unknown>) => post("stage", {
      ...data, actorClientId: host ? hostId : guestId,
      clientToken: host ? hostJoined.clientToken : joined.clientToken,
    }, host);
    assert.equal((await stageAction(false, { action: "toggle", enabled: true })).status, 403);
    const stageAnchor = await prisma.room.findUniqueOrThrow({ where: { id: room.id } });
    assert.equal((await stageAction(true, { action: "toggle", enabled: true, clientId: hostId })).status, 200);
    assert.equal((await sync(false)).stage?.enabled, true);
    assert.equal((await stageAction(false, { action: "leave", clientId: hostId })).status, 403);
    assert.equal((await stageAction(false, { action: "request_join", clientId: guestId, catId: "test-cat", catName: "Test", catGifUrl: "https://media.giphy.com/test.gif" })).status, 200);
    assert.equal((await stageAction(true, { action: "approve", clientId: guestId })).status, 200);
    assert.equal((await sync(false)).stage?.participants.length, 2);
    const persistedStage = await fetch(`${origin}/api/rooms/${code}/stage`);
    assert.equal((await persistedStage.json()).participants.length, 2);
    const lighting = { type: "wash", palette: "sunset", motion: "medium", pulse: "slow", brightness: 80 };
    assert.equal((await stageAction(false, { action: "set_lighting", lighting })).status, 403);
    assert.equal((await stageAction(true, { action: "set_lighting", lighting: { ...lighting, brightness: 150 } })).status, 400);
    assert.equal((await stageAction(true, { action: "set_lighting", lighting })).status, 200);
    assert.deepEqual((await sync(false)).stage?.lighting, lighting);
    const afterStage = await prisma.room.findUniqueOrThrow({ where: { id: room.id } });
    assert.equal((afterStage.stage as { participants: unknown[] }).participants.length, 2, "stage is persisted, not process-local");
    assert.equal(afterStage.lastSyncAt.toISOString(), stageAnchor.lastSyncAt.toISOString());
    assert.equal(afterStage.updatedAt.toISOString(), stageAnchor.updatedAt.toISOString());
    assert.equal((await stageAction(true, { action: "set_limit", maxParticipants: -1 })).status, 400);
    assert.equal((await post("stage", { action: "leave", clientId: hostId, actorClientId: hostId, clientToken: hostJoined.clientToken })).status, 403);
    // Host is preserved even when NextRequest normalizes its URL to localhost.
    // None of these cross-origin writes may gain authority through forwarding headers.
    const rejectedOrigins: Record<string, string>[] = [
      {},
      { Origin: "https://attacker.example", "x-forwarded-host": "attacker.example", "x-forwarded-proto": "https" },
      { Origin: `http://localhost:${address.port}` },
      { Origin: `http://127.0.0.1:${address.port === 65535 ? 65534 : address.port + 1}` },
      { Origin: `https://127.0.0.1:${address.port}` },
      { Origin: origin, "Sec-Fetch-Site": "cross-site" },
    ];
    for (const headers of rejectedOrigins) {
      const rejected = await fetch(`${origin}/api/rooms/${code}/commands`, {
        method: "POST", headers: { "Content-Type": "application/json", Cookie: hostCookie, ...headers },
        body: JSON.stringify({ clientId: hostId, command: { type: "playback", requestId: "origin-denied", payload: { allowQueueAdds: true } } }),
        signal: AbortSignal.timeout(15_000),
      });
      assert.equal(rejected.status, 403);
    }
    assert.equal((await post("commands", { clientId: hostId, command: { type: "playback", requestId: "impersonated", payload: { isPlaying: false } } })).status, 403);
    assert.equal((await post("leave", { clientId: hostId })).status, 403);
    assert.equal((await post("sync", { clientId: hostId, displayName: "Impersonator", heartbeat: true })).status, 409);
    assert.equal(joined.allowQueueAdds, false, "legacy locked permissions remain opt-in");
    assert.equal(joined.members.length, 2);
    assert.ok(joined.members.some((member) => member.clientId === hostId && member.isHost));
    // A nickname heartbeat affects only the caller's presence.
    const beforeRename = await prisma.room.findUniqueOrThrow({ where: { id: room.id } });
    assert.equal((await post("sync", { clientId: hostId, displayName: "  Movie   Fan  ", heartbeat: true }, true)).status, 200);
    assert.equal((await post("sync", { clientId: guestId, displayName: "guest@example.invalid", heartbeat: true })).status, 200);
    const renamed = await sync(false);
    assert.equal(renamed.members.find((member) => member.clientId === hostId)?.name, "Movie Fan");
    assert.equal(renamed.members.find((member) => member.clientId === hostId)?.isHost, true);
    assert.equal(renamed.members.find((member) => member.clientId === guestId)?.name, "Khách");
    assert.deepEqual(await prisma.room.findUniqueOrThrow({ where: { id: room.id } }), beforeRename);
    assert.equal((await command(false, { type: "chat", requestId: "guest-chat", body: "no account" })).status, 401);
    const messageId = crypto.randomUUID();
    const chat = { type: "chat", requestId: messageId, messageId, body: "HTTP chat" };
    assert.equal((await command(true, chat)).status, 200);
    assert.equal((await command(true, chat)).status, 200);
    assert.equal(await prisma.roomMessage.count({ where: { roomId: room.id } }), 1);
    const chatted = await sync(false);
    assert.equal(chatted.messages.at(-1)?.id, messageId);
    assert.equal(chatted.messages.at(-1)?.author.name, "Movie Fan");
    assert.equal((await command(true, { type: "playback", requestId: "play", payload: { isPlaying: true, positionSeconds: 45 } })).status, 200);
    assert.equal((await sync(false)).playback.positionSeconds, 45);
    assert.equal((await command(true, { type: "playback", requestId: "lock", payload: { hostOnlyControl: true } })).status, 200);
    assert.equal((await command(false, { type: "playback", requestId: "blocked", payload: { isPlaying: false } })).status, 403);
    assert.equal((await command(true, { type: "rename", requestId: "rename", title: "Renamed HTTP room" })).status, 200);
    assert.equal((await sync(false)).roomTitle, "Renamed HTTP room");
    const video = { videoId: "dQw4w9WgXcQ", title: "Queued", channel: "", thumbnail: "",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", watchUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration: 200 };
    const playbackAnchor = (row: typeof room) => ({
      isPlaying: row.isPlaying, positionSeconds: row.positionSeconds,
      lastSyncAt: row.lastSyncAt.toISOString(), playbackGeneration: row.playbackGeneration,
      videoId: row.videoId, lastActionById: row.lastActionById, lastActionKind: row.lastActionKind,
    });
    const beforePolicy = await prisma.room.findUniqueOrThrow({ where: { id: room.id } });
    const contributedId = crypto.randomUUID();
    const addContribution = { type: "queue", requestId: "guest-add", payload: { action: "add", id: contributedId, video } };
    assert.equal((await command(false, addContribution)).status, 403);
    assert.equal((await command(false, { type: "playback", requestId: "forge-policy", payload: { allowQueueAdds: true } })).status, 403);
    assert.equal((await command(true, { type: "playback", requestId: "allow-contributions", payload: { allowQueueAdds: true } })).status, 200);
    const contributionSnapshot = await sync(false);
    assert.equal(contributionSnapshot.hostOnlyControl, true);
    assert.equal(contributionSnapshot.allowQueueAdds, true);
    const detail = await fetch(`${origin}/api/rooms/${code}`);
    assert.equal((await detail.json()).room.allowQueueAdds, true);
    assert.deepEqual(playbackAnchor(await prisma.room.findUniqueOrThrow({ where: { id: room.id } })), playbackAnchor(beforePolicy));
    // An unjoined client cannot bypass presence checks, even if contributions are allowed.
    assert.equal((await post("commands", { clientId: crypto.randomUUID(), command: addContribution })).status, 403);
    // A guest cannot borrow the authenticated host's connection identity.
    assert.equal((await post("commands", { clientId: hostId, command: addContribution })).status, 403);
    assert.equal((await command(false, addContribution)).status, 200);
    assert.equal((await command(false, addContribution)).status, 200);
    assert.deepEqual((await sync(false)).queue.map((entry) => entry.id), [contributedId]);
    for (const payload of [
      { action: "remove", id: contributedId },
      { action: "move", id: contributedId, direction: "up" },
      { action: "next", generation: contributionSnapshot.playbackGeneration },
    ]) assert.equal((await command(false, { type: "queue", requestId: crypto.randomUUID(), payload })).status, 403);
    for (const payload of [
      { isPlaying: false }, { positionSeconds: 0 }, { video },
      { hostOnlyControl: false }, { allowQueueAdds: false },
    ]) assert.equal((await command(false, { type: "playback", requestId: crypto.randomUUID(), payload })).status, 403);
    await prisma.roomPresence.update({ where: { roomId_clientId: { roomId: room.id, clientId: guestId } }, data: { lastSeenAt: new Date(Date.now() - 61_000) } });
    assert.equal((await command(false, { ...addContribution, requestId: "expired-contribution", payload: { ...addContribution.payload, id: crypto.randomUUID() } })).status, 403);
    await sync(false, true);
    assert.equal((await command(true, { type: "playback", requestId: "stop-contributions", payload: { allowQueueAdds: false } })).status, 200);
    assert.equal((await command(false, { ...addContribution, requestId: "denied-after-revoke", payload: { ...addContribution.payload, id: crypto.randomUUID() } })).status, 403);
    assert.deepEqual(playbackAnchor(await prisma.room.findUniqueOrThrow({ where: { id: room.id } })), playbackAnchor(beforePolicy));
    assert.equal((await command(true, { type: "queue", requestId: "remove-contribution", payload: { action: "remove", id: contributedId } })).status, 200);
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
    // Playback lock and queue contribution settings never block genuine completion.
    const generation = (await sync(false)).playbackGeneration;
    const ended = { type: "queue", requestId: "guest-ended", payload: { action: "ended", generation, duration: 200 } };
    assert.equal((await command(false, ended)).status, 200);
    assert.deepEqual((await sync(false)).queue.map((entry) => entry.id), [secondId, firstId], "premature end reports cannot skip");
    assert.equal((await command(true, { type: "playback", requestId: "seek-end", payload: { positionSeconds: 200 } })).status, 200);
    assert.equal((await command(false, ended)).status, 200);
    assert.equal((await command(false, ended)).status, 200);
    const advanced = await sync(false);
    assert.deepEqual(advanced.queue.map((entry) => entry.id), [firstId]);
    assert.equal(advanced.playbackGeneration, generation + 1, "duplicate reports only advance once");
    // Direct links resolve independently of the Search API (even with no usable API key).
    assert.equal((await fetch(`${origin}/api/video-link?id=invalid`)).status, 400);
    const resolved = await fetch(`${origin}/api/video-link?id=dQw4w9WgXcQ`);
    assert.equal(resolved.status, 200);
    const { video: directVideo } = await resolved.json();
    assert.equal(directVideo.id, "dQw4w9WgXcQ");
    const directId = crypto.randomUUID();
    const directAdd = { type: "queue", requestId: "direct-link", payload: { action: "add", id: directId, video: {
      videoId: directVideo.id, title: directVideo.title, channel: directVideo.channel,
      thumbnail: directVideo.thumbnail, embedUrl: directVideo.embedUrl, watchUrl: directVideo.watchUrl,
      duration: directVideo.durationSeconds,
    } } };
    assert.equal((await command(true, directAdd)).status, 200);
    const linkedQueue = await sync(false);
    assert.equal(linkedQueue.queue.at(-1)?.id, directId);
    assert.equal(linkedQueue.queue.at(-1)?.videoId, "dQw4w9WgXcQ");
    const deleted = await fetch(`${origin}/api/rooms/${code}`, { method: "DELETE", headers: { Cookie: hostCookie, Origin: origin } });
    assert.equal(deleted.status, 200);
    assert.equal((await post("sync", { clientId: guestId, displayName: "Guest", heartbeat: false })).status, 404);
  } finally {
    server.kill();
    await exited;
    await prisma.user.deleteMany({ where: { id: user.id } });
  }
});
