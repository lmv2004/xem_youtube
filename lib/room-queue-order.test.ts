import test from "node:test";
import assert from "node:assert/strict";
import { moveQueueItem } from "./room-queue-order";
import { roomCommand } from "./room-protocol";
import type { RoomQueueItem } from "./rooms";

const queue = ["a", "b", "c"].map((id) => ({
  id,
  videoId: "dQw4w9WgXcQ",
  title: id,
})) as RoomQueueItem[];
test("move uses entry IDs even when video IDs match, without mutating the snapshot", () => {
  assert.deepEqual(
    moveQueueItem(queue, "c", "up").map((x) => x.id),
    ["a", "c", "b"],
  );
  assert.deepEqual(
    moveQueueItem(queue, "a", "down").map((x) => x.id),
    ["b", "a", "c"],
  );
  assert.deepEqual(
    queue.map((x) => x.id),
    ["a", "b", "c"],
  );
});
test("boundary moves and stale IDs are harmless, newly added entries survive", () => {
  assert.equal(moveQueueItem(queue, "a", "up"), queue);
  assert.equal(moveQueueItem(queue, "c", "down"), queue);
  assert.equal(moveQueueItem(queue, "removed", "up"), queue);
  const afterAdd = [...queue, { ...queue[0], id: "d" }];
  assert.deepEqual(
    moveQueueItem(afterAdd, "b", "down").map((x) => x.id),
    ["a", "c", "b", "d"],
  );
});
test("queue command rejects arbitrary directions", () => {
  const command = {
    type: "queue",
    requestId: "qa",
    payload: { action: "move", id: "b", direction: "up" },
  };
  assert.equal(roomCommand.safeParse(command).success, true);
  assert.equal(
    roomCommand.safeParse({
      ...command,
      payload: { ...command.payload, direction: "sideways" },
    }).success,
    false,
  );
});
