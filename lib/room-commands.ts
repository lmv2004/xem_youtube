import { Prisma, type Room } from "@prisma/client";
import { prisma } from "./db";
import { playbackInput, NOTICE_CHANNEL, type RoomNotice, type RoomCommand } from "./room-protocol";
import type { RoomQueueItem } from "./rooms";
import { PRESENCE_TIMEOUT_MS, type RoomPlaybackUpdate, type PlaybackActionKind } from "./rooms";

export type RoomActor = { id?: string; name?: string | null; image?: string | null };
export class RoomCommandError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function notifyRoom(tx: Prisma.TransactionClient, notice: RoomNotice) {
  // Only small record references cross NOTIFY; payloads stay below its 8KB limit.
  await tx.$queryRaw`SELECT pg_notify(${NOTICE_CHANNEL}, ${JSON.stringify(notice)})::text`;
}
export function playbackDto(room: Room): RoomPlaybackUpdate {
  return {
    queue: room.queue as RoomQueueItem[], playbackGeneration: room.playbackGeneration,
    revision: room.updatedAt.toISOString(),
    playback: { isPlaying: room.isPlaying, positionSeconds: room.positionSeconds,
      lastSyncAt: room.lastSyncAt.toISOString(), lastActionBy: room.lastActionBy,
      lastActionById: room.lastActionById, lastActionKind: room.lastActionKind as PlaybackActionKind | null },
    video: { videoId: room.videoId, title: room.videoTitle, channel: room.channel,
      thumbnail: room.thumbnail, embedUrl: room.embedUrl, watchUrl: room.watchUrl, duration: room.duration },
    hostOnlyControl: room.hostOnlyControl, serverTime: new Date().toISOString(),
  };
}
export async function updatePlayback(code: string, clientId: string, actor: RoomActor, raw: unknown) {
  const parsed = playbackInput.safeParse(raw);
  if (!parsed.success) throw new RoomCommandError(400, "Dữ liệu điều khiển không hợp lệ.");
  return prisma.$transaction(async (tx) => {
    // Serialize mutations across instances, including lock checks and video changes.
    await tx.$queryRaw`SELECT id FROM "Room" WHERE code = ${code} FOR UPDATE`;
    const room = await tx.room.findUnique({ where: { code } });
    if (!room) throw new RoomCommandError(404, "Phòng đã đóng.");
    const presence = await tx.roomPresence.findUnique({ where: { roomId_clientId: { roomId: room.id, clientId } } });
    if (!presence || presence.lastSeenAt.getTime() < Date.now() - PRESENCE_TIMEOUT_MS ||
      (presence.userId && presence.userId !== actor.id)) throw new RoomCommandError(403, "Bạn cần tham gia phòng trước khi điều khiển.");
    const isHost = actor.id === room.hostId;
    const { isPlaying, positionSeconds, hostOnlyControl, video } = parsed.data;
    if (hostOnlyControl !== undefined && !isHost) throw new RoomCommandError(403, "Chỉ chủ phòng được đổi quyền điều khiển.");
    const locked = hostOnlyControl ?? room.hostOnlyControl;
    const changed = isPlaying !== undefined || positionSeconds !== undefined || video !== undefined;
    if (changed && locked && !isHost) throw new RoomCommandError(403, "Chủ phòng đang khóa điều khiển.");
    const now = new Date();
    const updated = await tx.room.update({ where: { code }, data: {
      hostOnlyControl: locked,
      updatedAt: new Date(Math.max(now.getTime(), room.updatedAt.getTime() + 1)),
      ...(changed ? {
        isPlaying: isPlaying ?? room.isPlaying,
        positionSeconds: video ? 0 : positionSeconds ?? Math.min(86400, room.positionSeconds + (room.isPlaying ? Math.max(0, now.getTime() - room.lastSyncAt.getTime()) / 1000 : 0)),
        lastSyncAt: now, lastActionBy: presence.name, lastActionById: clientId,
        lastActionKind: video ? "video" : isPlaying === true ? "play" : isPlaying === false ? "pause" : "seek",
      } : {}),
      ...(video ? { videoId: video.videoId, videoTitle: video.title, channel: video.channel,
        playbackGeneration: { increment: 1 },
        thumbnail: video.thumbnail, embedUrl: video.embedUrl, watchUrl: video.watchUrl, duration: video.duration } : {}),
    } });
    await notifyRoom(tx, { code, kind: "playback" });
    return playbackDto(updated);
  });
}
export async function updateQueue(code: string, clientId: string, actor: RoomActor,
  command: Extract<RoomCommand, { type: "queue" }>["payload"]) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Room" WHERE code = ${code} FOR UPDATE`;
    const room = await tx.room.findUnique({ where: { code } });
    if (!room) throw new RoomCommandError(404, "Phòng đã đóng.");
    const presence = await tx.roomPresence.findUnique({ where: { roomId_clientId: { roomId: room.id, clientId } } });
    if (!presence || presence.lastSeenAt.getTime() < Date.now() - PRESENCE_TIMEOUT_MS ||
      (presence.userId && presence.userId !== actor.id)) throw new RoomCommandError(403, "Bạn cần tham gia phòng.");
    // Any active viewer can report a genuine end, even if the host is absent.
    if (command.action !== "ended" && room.hostOnlyControl && actor.id !== room.hostId) {
      throw new RoomCommandError(403, "Chỉ chủ phòng được sửa hàng đợi khi đang khóa.");
    }
    const queue = room.queue as RoomQueueItem[];
    const now = new Date();
    const data: Prisma.RoomUpdateInput = { updatedAt: new Date(Math.max(now.getTime(), room.updatedAt.getTime() + 1)) };
    if (command.action === "add") {
      if (queue.length >= 50) throw new RoomCommandError(400, "Hàng đợi tối đa 50 video.");
      data.queue = [...queue, { ...command.video, id: crypto.randomUUID() }];
    } else if (command.action === "remove") {
      data.queue = queue.filter((item) => item.id !== command.id);
    } else {
      // Row lock + generation protect against simultaneous / delayed ENDED reports,
      // including consecutive entries containing the exact same YouTube video.
      if (command.generation !== room.playbackGeneration) return playbackDto(room);
      if (command.action === "ended") {
        const duration = room.duration || command.duration;
        const position = room.positionSeconds + Math.max(0, now.getTime() - room.lastSyncAt.getTime()) / 1000;
        if (!room.isPlaying || position < duration - 2) return playbackDto(room);
      }
      const [next, ...remaining] = queue;
      if (!next && command.action === "next") return playbackDto(room);
      Object.assign(data, { queue: remaining, playbackGeneration: { increment: 1 },
        isPlaying: Boolean(next), positionSeconds: next ? 0 : room.duration || (command.action === "ended" ? command.duration : 0),
        lastSyncAt: now, lastActionBy: presence.name, lastActionById: clientId, lastActionKind: next ? "video" : "pause" });
      if (next) Object.assign(data, { videoId: next.videoId, videoTitle: next.title, channel: next.channel,
        thumbnail: next.thumbnail, embedUrl: next.embedUrl, watchUrl: next.watchUrl, duration: next.duration });
    }
    const updated = await tx.room.update({ where: { code }, data });
    await notifyRoom(tx, { code, kind: "playback" });
    return playbackDto(updated);
  });
}
export async function postRoomMessage(code: string, actor: RoomActor, body: string) {
  if (!actor.id) throw new RoomCommandError(401, "Bạn cần đăng nhập để chat.");
  if (!body.trim() || body.trim().length > 500) throw new RoomCommandError(400, "Tin nhắn không hợp lệ.");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Room" WHERE code = ${code} FOR UPDATE`;
    const room = await tx.room.findUnique({ where: { code } });
    if (!room) throw new RoomCommandError(404, "Phòng đã đóng.");
    const row = await tx.roomMessage.create({ data: { roomId: room.id, userId: actor.id!, body: body.trim() },
      include: { user: { select: { id: true, name: true, image: true } } } });
    await notifyRoom(tx, { code, kind: "chat", id: row.id });
    return { id: row.id, body: row.body, createdAt: row.createdAt.toISOString(), author: row.user };
  });
}
