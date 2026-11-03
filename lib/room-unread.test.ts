import { test } from "node:test";
import assert from "node:assert/strict";
import { createRoomUnreadTracker } from "./room-unread";
const message = (id: string, author = "friend") => ({ id, body: "hello", createdAt: "2026-11-03T00:00:00Z", author: { id: author, name: "Guest", image: null } });
test("first completed snapshot is history, including after an empty loading state", () => {
  const tracker = createRoomUnreadTracker();
  assert.equal(tracker.update([], false, "me", false), 0);
  assert.equal(tracker.update([message("old")], true, "me", false), 0);
  assert.equal(tracker.update([message("old"), message("new")], true, "me", false), 1);
});
test("poll echoes, reconnects and own messages do not inflate unread", () => {
  const tracker = createRoomUnreadTracker();
  tracker.update([], true, "me", false);
  const batch = [message("incoming"), message("mine", "me")];
  assert.equal(tracker.update(batch, true, "me", false), 1);
  assert.equal(tracker.update(batch, true, "me", false), 1);
  assert.equal(tracker.update([], false, "me", false), 1);
  assert.equal(tracker.update(batch, true, "me", false), 1);
});
test("reading clears unread; later messages while away count again", () => {
  const tracker = createRoomUnreadTracker();
  tracker.update([], true, "me", false);
  const batch = [message("a"), message("b")];
  assert.equal(tracker.update(batch, true, "me", false), 2);
  assert.equal(tracker.update(batch, true, "me", true), 0);
  assert.equal(tracker.update([...batch, message("c")], true, "me", true), 0);
  assert.equal(tracker.update([message("c"), message("d")], true, "me", false), 1);
});
test("guests receive notifications and repeated IDs in one batch count once", () => {
  const tracker = createRoomUnreadTracker();
  tracker.update([], true, null, false);
  assert.equal(tracker.update([message("a"), message("a")], true, null, false), 1);
});
