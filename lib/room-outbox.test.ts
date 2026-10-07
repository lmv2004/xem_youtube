import test from "node:test";
import assert from "node:assert/strict";
import { createRoomOutbox, type OutboxMessage } from "./room-outbox";

function deferred() {
  let resolve!: (ok: boolean) => void;
  const promise = new Promise<boolean>((done) => { resolve = done; });
  return { promise, resolve };
}
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

test("rapid submissions keep distinct text and send in order without overlapping requests", async () => {
  const first = deferred();
  const second = deferred();
  const calls: string[] = [];
  let snapshot: OutboxMessage[] = [];
  const outbox = createRoomOutbox((body) => {
    calls.push(body);
    return calls.length === 1 ? first.promise : second.promise;
  }, (messages) => { snapshot = messages; });
  outbox.enqueue("First message");
  outbox.enqueue("Next message");
  assert.deepEqual(calls, ["First message"]);
  assert.deepEqual(snapshot.map((m) => [m.body, m.status]), [["First message", "sending"], ["Next message", "queued"]]);
  first.resolve(true);
  await flush();
  assert.deepEqual(calls, ["First message", "Next message"]);
  assert.equal(snapshot[0].body, "Next message");
  second.resolve(true);
  await flush();
  assert.deepEqual(snapshot, []);
});

test("failed text survives while later messages can be sent", async () => {
  let snapshot: OutboxMessage[] = [];
  const outbox = createRoomOutbox(async (body) => body !== "failed", (messages) => { snapshot = messages; });
  outbox.enqueue("failed");
  outbox.enqueue("next");
  await flush();
  assert.equal(snapshot.length, 1);
  assert.equal(snapshot[0].status, "failed");
  assert.equal(outbox.restore(snapshot[0].id), "failed");
  assert.deepEqual(snapshot, []);
});

test("transport exceptions retain the message without automatically retrying", async () => {
  let calls = 0;
  let snapshot: OutboxMessage[] = [];
  const outbox = createRoomOutbox(async () => { calls++; throw new Error("offline"); }, (messages) => { snapshot = messages; });
  outbox.enqueue("Keep this text");
  await flush();
  assert.equal(calls, 1);
  assert.equal(snapshot[0].body, "Keep this text");
  assert.equal(snapshot[0].status, "failed");
});

test("leaving stops queued sends and late UI updates", async () => {
  const first = deferred();
  let calls = 0;
  let updates = 0;
  const outbox = createRoomOutbox(() => { calls++; return first.promise; }, () => { updates++; });
  outbox.enqueue("first");
  outbox.enqueue("second");
  outbox.stop();
  const before = updates;
  first.resolve(true);
  await flush();
  assert.equal(calls, 1);
  assert.equal(updates, before);
  assert.equal(outbox.enqueue("third"), false);
});

test("outbox is bounded and cannot restore an in-flight message", () => {
  let snapshot: OutboxMessage[] = [];
  const outbox = createRoomOutbox(() => new Promise(() => {}), (messages) => { snapshot = messages; });
  assert.equal(outbox.enqueue("  "), false);
  for (let i = 0; i < 20; i++) assert.equal(outbox.enqueue(String(i)), true);
  assert.equal(outbox.enqueue("overflow"), false);
  assert.equal(snapshot.length, 20);
  assert.equal(outbox.restore(snapshot[0].id), null);
  outbox.stop();
});
