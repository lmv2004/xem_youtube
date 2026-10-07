import test from "node:test";
import assert from "node:assert/strict";
import { projectQueue, type QueueEdit } from "./room-optimistic-queue";
import type { RoomQueueItem } from "./rooms";
const video = {
  videoId: "dQw4w9WgXcQ",
  title: "Same video",
  channel: "",
  thumbnail: "",
  embedUrl: "",
  watchUrl: "",
  duration: 100,
};
const entry = (id: string): RoomQueueItem => ({ ...video, id });
const ids = (items: RoomQueueItem[]) => items.map((item) => item.id);
test("rapid duplicate-video adds stay distinct and server echo does not duplicate optimistic entries", () => {
  const edits: QueueEdit[] = ["one", "two"].map((id) => ({
    requestId: id,
    payload: { action: "add", id, video },
  }));
  assert.deepEqual(ids(projectQueue([], edits)), ["one", "two"]);
  assert.deepEqual(ids(projectQueue([entry("one")], edits)), ["one", "two"]);
  assert.deepEqual(ids(projectQueue([entry("one"), entry("two")], edits)), [
    "one",
    "two",
  ]);
});
test("reorder is stable when a latest snapshot already includes the pending operation", () => {
  const edits: QueueEdit[] = [
    {
      requestId: "move",
      payload: { action: "move", id: "c", direction: "up", beforeId: "b" },
    },
  ];
  assert.deepEqual(
    ids(projectQueue([entry("a"), entry("b"), entry("c")], edits)),
    ["a", "c", "b"],
  );
  assert.deepEqual(
    ids(projectQueue([entry("a"), entry("c"), entry("b")], edits)),
    ["a", "c", "b"],
  );
});
test("failed operation rollback preserves newer remote entries and remaining local intents", () => {
  const base = [entry("remote"), entry("a"), entry("b")];
  const edits: QueueEdit[] = [
    {
      requestId: "failed-add",
      payload: { action: "add", id: "failed", video },
    },
    { requestId: "remove", payload: { action: "remove", id: "a" } },
  ];
  assert.deepEqual(ids(projectQueue(base, edits)), ["remote", "b", "failed"]);
  assert.deepEqual(
    ids(
      projectQueue(
        base,
        edits.filter((edit) => edit.requestId !== "failed-add"),
      ),
    ),
    ["remote", "b"],
  );
  assert.deepEqual(ids(base), ["remote", "a", "b"]);
});
test("a deleted move anchor does not move the wrong neighbor", () => {
  const edits: QueueEdit[] = [
    {
      requestId: "move",
      payload: { action: "move", id: "c", direction: "up", beforeId: "b" },
    },
  ];
  assert.deepEqual(ids(projectQueue([entry("a"), entry("c")], edits)), [
    "a",
    "c",
  ]);
});
