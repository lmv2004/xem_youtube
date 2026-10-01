import test from "node:test";
import assert from "node:assert/strict";
import { mergeMessages, messageCursor, parseMessageCursor, syncDelay } from "./room-sync";
import { effectivePosition, type RoomMessageDto, type RoomPlayback } from "./rooms";
import { deleteOwnedRoom } from "./delete-room";

const at = "2026-10-01T10:00:00.000Z";
const message = (id: string, createdAt = at): RoomMessageDto => ({
  id, createdAt, body: id, author: { id: "user", name: "Viewer", image: null },
});

test("concurrent remote messages survive a local send and deduplicate on replay", () => {
  const local = mergeMessages([message("a")], [message("c")]);
  const merged = mergeMessages(local, [message("b"), message("c")]);
  assert.deepEqual(merged.map((m) => m.id), ["a", "b", "c"]);
  assert.deepEqual(mergeMessages(merged, [message("b")]), merged);
});

test("chat memory is bounded while preserving the most recent messages", () => {
  const rows = Array.from({ length: 350 }, (_, i) => message(String(i).padStart(3, "0")));
  const merged = mergeMessages([], rows);
  assert.equal(merged.length, 300);
  assert.equal(merged[0].id, "050");
  assert.equal(merged.at(-1)?.id, "349");
});

test("cursor distinguishes messages sharing a timestamp and accepts legacy cursors", () => {
  assert.deepEqual(parseMessageCursor(messageCursor(message("b"))), { createdAt: new Date(at), id: "b" });
  assert.deepEqual(parseMessageCursor(at), { createdAt: new Date(at), id: undefined });
  assert.equal(parseMessageCursor("invalid"), null);
  assert.equal(parseMessageCursor(null), null);
});

test("polling adapts to playback, background tabs, and network failures", () => {
  assert.equal(syncDelay(true, false), 1500);
  assert.equal(syncDelay(false, false), 3000);
  assert.equal(syncDelay(true, true), 15000);
  assert.equal(syncDelay(true, false, 1), 3000);
  assert.equal(syncDelay(true, false, 3), 12000);
  assert.equal(syncDelay(true, false, 50), 30000);
});

test("playback accounts for elapsed time since receipt even on a skewed device", () => {
  const playback: RoomPlayback = { isPlaying: true, positionSeconds: 10, lastSyncAt: at,
    lastActionBy: null, lastActionById: null, lastActionKind: null };
  assert.equal(effectivePosition(playback, {
    serverTime: "2026-10-01T10:00:02.000Z", receivedAt: 5000, now: 8000,
  }), 15);
  assert.equal(effectivePosition({ ...playback, isPlaying: false }, {
    serverTime: at, receivedAt: 5000, now: 8000,
  }), 10);
});

test("delete denies anonymous and non-host callers without mutating storage", async () => {
  let reads = 0;
  const store = {
    async findUnique() { reads++; return { hostId: "host" }; },
    async deleteMany() { assert.fail("Unauthorized deletion"); return { count: 0 }; },
  };
  assert.equal((await deleteOwnedRoom(store, "ABCDEF")).status, 401);
  assert.equal(reads, 0);
  assert.equal((await deleteOwnedRoom(store, "ABCDEF", "guest")).status, 403);
});

test("host deletion includes ownership in the atomic predicate", async () => {
  const store = {
    async findUnique() { return { hostId: "host" }; },
    async deleteMany(args: unknown) {
      assert.deepEqual(args, { where: { code: "ABCDEF", hostId: "host" } });
      return { count: 1 };
    },
  };
  assert.equal((await deleteOwnedRoom(store, "ABCDEF", "host")).status, 200);
  assert.equal((await deleteOwnedRoom({ ...store, async findUnique() { return null; } }, "ABCDEF", "host")).status, 404);
});
