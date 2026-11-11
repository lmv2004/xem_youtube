import type { Prisma, Room } from "@prisma/client";
import { PRESENCE_TIMEOUT_MS } from "./rooms";
import { boundedRoomPosition } from "./room-player-timeline";

/** Caller holds the room row lock, shared with playback/queue commands. */
export async function pauseEmptyRoom(
  tx: Prisma.TransactionClient,
  room: Room,
  now: Date,
  departedAt?: Date,
) {
  if (!room.isPlaying) return room;
  const latest = await tx.roomPresence.findFirst({
    where: { roomId: room.id },
    orderBy: { lastSeenAt: "desc" },
    select: { lastSeenAt: true },
  });
  if (latest && latest.lastSeenAt.getTime() >= now.getTime() - PRESENCE_TIMEOUT_MS)
    return room;
  const lastViewingAt = departedAt ?? latest?.lastSeenAt ?? room.lastSyncAt;
  const elapsed = Math.max(0, lastViewingAt.getTime() - room.lastSyncAt.getTime()) / 1000;
  return tx.room.update({
    where: { id: room.id },
    data: {
      isPlaying: false,
      positionSeconds: boundedRoomPosition(room.positionSeconds + elapsed, room.duration),
      lastSyncAt: now,
      updatedAt: new Date(Math.max(now.getTime(), room.updatedAt.getTime() + 1)),
    },
  });
}
