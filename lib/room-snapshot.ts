import { roomPublicAuthor } from "./room-public-author";
import type { Room } from "@prisma/client";
import { prisma } from "./db";
import { playbackDto } from "./room-commands";
import { messageCursor, parseMessageCursor } from "./room-sync";
import { MESSAGE_PAGE_SIZE, PRESENCE_TIMEOUT_MS, type RoomSyncResponse } from "./rooms";

/** Authoritative snapshot for HTTP polling and paginated chat catch-up. */
export async function readRoomSnapshot(room: Room, after?: string | null): Promise<RoomSyncResponse> {
  const cursor = parseMessageCursor(after);
  const [rows, presences] = await Promise.all([
    prisma.roomMessage.findMany({
      where: {
        roomId: room.id,
        ...(cursor ? cursor.id ? { OR: [
          { createdAt: { gt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { gt: cursor.id } },
        ] } : { createdAt: { gte: cursor.createdAt } } : {}),
      },
      orderBy: [{ createdAt: cursor ? "asc" : "desc" }, { id: cursor ? "asc" : "desc" }],
      take: MESSAGE_PAGE_SIZE,
      include: { user: { select: { id: true } } },
    }),
    prisma.roomPresence.findMany({
      where: { roomId: room.id, lastSeenAt: { gte: new Date(Date.now() - PRESENCE_TIMEOUT_MS) } },
      orderBy: { joinedAt: "asc" },
      take: 100,
    }),
  ]);
  const ordered = cursor ? rows : [...rows].reverse();
  const messages = ordered.map((row) => ({
    id: row.id, body: row.body, createdAt: row.createdAt.toISOString(), author: roomPublicAuthor(row.userId, presences.find(p => p.userId === row.userId)?.name),
  }));
  return {
    ...playbackDto(room),
    messages,
    members: presences.map((presence) => ({
      clientId: presence.clientId, name: presence.name, image: presence.image,
      isHost: presence.userId === room.hostId, isGuest: !presence.userId,
      joinedAt: presence.joinedAt.toISOString(),
    })),
    cursor: messages.length ? messageCursor(messages[messages.length - 1]) : after ?? null,
  };
}
