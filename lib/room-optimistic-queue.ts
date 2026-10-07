import type { RoomCommand } from "./room-protocol";
import type { RoomQueueItem } from "./rooms";
import { placeQueueItem } from "./room-queue-placement";
export type QueueEdit = {
  requestId: string;
  payload: Extract<RoomCommand, { type: "queue" }>["payload"];
};
/** Rebase outstanding intents on the latest server queue; never rewind remote edits. */
export function projectQueue(queue: RoomQueueItem[], edits: QueueEdit[]) {
  return edits.reduce((items, { payload }) => {
    if (payload.action === "add" && payload.id)
      return items.some((item) => item.id === payload.id)
        ? items
        : [...items, { ...payload.video, id: payload.id }];
    if (payload.action === "remove")
      return items.filter((item) => item.id !== payload.id);
    if (payload.action === "move")
      return placeQueueItem(
        items,
        payload.id,
        payload.direction,
        payload.beforeId,
        payload.afterId,
      );
    return items;
  }, queue);
}
