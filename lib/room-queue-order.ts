import type { RoomQueueItem } from "./rooms";

/** Move relative to a stable item ID, using the latest queue under the row lock. */
export function moveQueueItem(
  queue: RoomQueueItem[],
  id: string,
  direction: "up" | "down",
) {
  const index = queue.findIndex((item) => item.id === id);
  const target = index + (direction === "up" ? -1 : 1);
  if (index < 0 || target < 0 || target >= queue.length) return queue;
  const result = [...queue];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}
