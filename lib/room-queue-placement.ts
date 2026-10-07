import type { RoomQueueItem } from "./rooms";
import { moveQueueItem } from "./room-queue-order";
export function placeQueueItem(
  queue: RoomQueueItem[],
  id: string,
  direction: "up" | "down",
  beforeId?: string,
  afterId?: string,
) {
  if (!beforeId && !afterId) return moveQueueItem(queue, id, direction);
  const anchor = beforeId ?? afterId;
  const item = queue.find((entry) => entry.id === id);
  if (!item || anchor === id || !queue.some((entry) => entry.id === anchor))
    return queue;
  const remaining = queue.filter((entry) => entry.id !== id);
  const index =
    remaining.findIndex((entry) => entry.id === anchor) + (beforeId ? 0 : 1);
  return [...remaining.slice(0, index), item, ...remaining.slice(index)];
}
