import { HEARTBEAT_INTERVAL_MS, SYNC_INTERVAL_MS, type RoomMessageDto } from "./rooms";

export function syncDelay(playing: boolean, hidden: boolean, failures = 0): number {
  if (failures) return Math.min(30_000, 3000 * 2 ** Math.min(failures - 1, 4));
  return hidden ? HEARTBEAT_INTERVAL_MS : playing ? SYNC_INTERVAL_MS : 3000;
}

export function messageCursor(message: { createdAt: string; id: string }): string {
  return `${message.createdAt}|${message.id}`;
}

export function parseMessageCursor(cursor?: string | null) {
  if (!cursor) return null;
  const [date, id] = cursor.split("|");
  const createdAt = new Date(date);
  return Number.isNaN(createdAt.getTime()) ? null : { createdAt, id };
}

/** Local sends never advance the server cursor; concurrent messages still arrive. */
export function mergeMessages(previous: RoomMessageDto[], incoming: RoomMessageDto[]) {
  const messages = new Map(previous.map((message) => [message.id, message]));
  for (const message of incoming) messages.set(message.id, message);
  return [...messages.values()]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(-300);
}
