import test from "node:test";
import assert from "node:assert/strict";
import { canAddToQueue, canControlPlayback } from "./rooms";
import { playbackInput } from "./room-protocol";

test("hosts and unlocked rooms retain playback and queue permissions", () => {
  for (const hostOnlyControl of [false, true]) {
    for (const allowQueueAdds of [false, true]) {
      const host = { hostOnlyControl, allowQueueAdds, isHost: true };
      assert.equal(canControlPlayback(host), true);
      assert.equal(canAddToQueue(host), true);
      if (!hostOnlyControl) {
        assert.equal(canControlPlayback({ ...host, isHost: false }), true);
        assert.equal(canAddToQueue({ ...host, isHost: false }), true);
      }
    }
  }
});

test("a locked room grants contributions without playback control", () => {
  const member = { hostOnlyControl: true, allowQueueAdds: false, isHost: false };
  assert.equal(canControlPlayback(member), false);
  assert.equal(canAddToQueue(member), false);
  const contributor = { ...member, allowQueueAdds: true };
  assert.equal(canAddToQueue(contributor), true);
  assert.equal(canControlPlayback(contributor), false);
});

test("queue contribution policy accepts only explicit booleans", () => {
  assert.equal(playbackInput.safeParse({ allowQueueAdds: true }).success, true);
  assert.equal(playbackInput.safeParse({ allowQueueAdds: false }).success, true);
  assert.equal(playbackInput.safeParse({ allowQueueAdds: "true" }).success, false);
});
