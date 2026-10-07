import test from "node:test";
import assert from "node:assert/strict";
import { RoomClosedError, startRoomPolling } from "./room-poller";
import type { RoomSyncResponse } from "./rooms";

const snapshot = { cursor: null, messages: [] } as unknown as RoomSyncResponse;
const flush = async () => { for (let index = 0; index < 10; index++) await Promise.resolve(); };

test("polling serializes refreshes and drains one queued refresh after a slow request", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let resolve!: (data: RoomSyncResponse) => void;
  let reads = 0;
  const poller = startRoomPolling({
    read: async () => { reads++; return new Promise((done) => { resolve = done; }); },
    apply() {}, status() {}, closed() { assert.fail("unexpected room closure"); }, hidden: () => false,
  });
  poller.refresh(); poller.refresh();
  assert.equal(reads, 1);
  resolve(snapshot); await flush();
  context.mock.timers.tick(0); await flush();
  assert.equal(reads, 2);
  resolve(snapshot); await flush();
  poller.stop();
  context.mock.timers.tick(30_000); await flush();
  assert.equal(reads, 2);
});

test("transient polling failures preserve room state and recover without closing the room", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let reads = 0;
  let applied = 0;
  const statuses: boolean[] = [];
  const poller = startRoomPolling({
    async read() { if (++reads <= 3) throw new Error("temporary 503"); return snapshot; },
    apply() { applied++; }, status(value) { statuses.push(value); },
    closed() { assert.fail("temporary errors must not evict a viewer"); }, hidden: () => false,
  });
  await flush(); assert.deepEqual(statuses, []);
  context.mock.timers.tick(2000); await flush(); assert.deepEqual(statuses, []);
  context.mock.timers.tick(4000); await flush(); assert.deepEqual(statuses, [true]);
  context.mock.timers.tick(8000); await flush();
  assert.deepEqual(statuses, [true, false]); assert.equal(applied, 1);
  poller.stop();
});

test("only a confirmed missing room stops polling", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let closed = 0;
  let reads = 0;
  const poller = startRoomPolling({
    async read() { reads++; throw new RoomClosedError(); }, apply() {}, status() {},
    closed() { closed++; }, hidden: () => false,
  });
  await flush(); context.mock.timers.tick(30_000); await flush(); poller.refresh();
  assert.equal(closed, 1); assert.equal(reads, 1);
});

test("background polls slow down; restoring a page keeps the cursor and renews presence", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const calls: { after: string | null; heartbeat: boolean }[] = [];
  const poller = startRoomPolling({
    async read(after, heartbeat) { calls.push({ after, heartbeat }); return { ...snapshot, cursor: "last-message" }; },
    apply() {}, status() {}, closed() {}, hidden: () => true,
  });
  await flush(); context.mock.timers.tick(2000); await flush(); assert.equal(calls.length, 1);
  context.mock.timers.tick(13_000); await flush(); assert.equal(calls.length, 2);
  assert.equal(calls[1].heartbeat, false);
  poller.pause(); context.mock.timers.tick(60_000); await flush(); assert.equal(calls.length, 2);
  poller.resume(); await flush();
  assert.deepEqual(calls[2], { after: "last-message", heartbeat: true });
  poller.stop();
});

test("missed chat pages are fetched without advancing past concurrent local sends", async () => {
  const cursors: (string | null)[] = [];
  const poller = startRoomPolling({
    async read(after) {
      cursors.push(after);
      return { ...snapshot, cursor: after === null ? "initial" : after === "initial" ? "page-1" : "page-2",
        messages: after === "initial" ? Array(50).fill({}) : [] };
    }, apply() {}, status() {}, closed() {}, hidden: () => false,
  });
  await flush(); poller.refresh(); await flush();
  assert.deepEqual(cursors, [null, "initial", "page-1"]);
  poller.stop();
});

test("stop aborts a pending request and ignores a late response", async () => {
  let resolve!: (data: RoomSyncResponse) => void;
  let signal!: AbortSignal;
  const poller = startRoomPolling({
    read: async (_after, _heartbeat, currentSignal) => {
      signal = currentSignal;
      return new Promise((done) => { resolve = done; });
    },
    apply() { assert.fail("late snapshot after leaving"); },
    status() { assert.fail("late readiness after leaving"); }, closed() {}, hidden: () => false,
  });
  poller.stop(); assert.equal(signal.aborted, true);
  resolve(snapshot); await flush();
});

test("presence is refreshed at twenty-second intervals rather than every poll", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  const heartbeats: boolean[] = [];
  const poller = startRoomPolling({
    async read(_after, heartbeat) { heartbeats.push(heartbeat); return snapshot; },
    apply() {}, status() {}, closed() {}, hidden: () => false,
  });
  await flush();
  for (let tick = 0; tick < 10; tick++) { context.mock.timers.tick(2000); await flush(); }
  assert.equal(heartbeats.length, 11);
  assert.equal(heartbeats.filter(Boolean).length, 2);
  assert.equal(heartbeats[0], true); assert.equal(heartbeats[10], true);
  poller.stop();
});
