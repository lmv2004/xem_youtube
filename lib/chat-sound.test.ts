import { test } from "node:test";
import assert from "node:assert/strict";
import { createChatSoundGate, normalizeChatVolume } from "./chat-sound";
test("only increases in unread play, at most once per four seconds", () => {
  const cue = createChatSoundGate();
  assert.equal(cue(0, true, 0), false);
  assert.equal(cue(1, true, 10), true);
  assert.equal(cue(2, true, 100), false);
  assert.equal(cue(2, true, 5000), false);
  assert.equal(cue(3, true, 5010), true);
});
test("muted and blocked audio never replays old unread on enable", () => {
  const cue = createChatSoundGate();
  assert.equal(cue(4, false, 0), false);
  assert.equal(cue(4, true, 10), false);
  assert.equal(cue(5, true, 20), true);
  assert.equal(cue(6, false, 8000), false);
  assert.equal(cue(6, true, 9000), false);
});
test("clearing read messages resets count without creating a cue", () => {
  const cue = createChatSoundGate();
  assert.equal(cue(1, true, 0), true);
  assert.equal(cue(0, true, 5000), false);
  assert.equal(cue(1, true, 6000), true);
});

test("notification volume is bounded and invalid saved values use the default", () => {
  assert.equal(normalizeChatVolume(NaN), 70);
  assert.equal(normalizeChatVolume(Infinity), 70);
  assert.equal(normalizeChatVolume(-3), 10);
  assert.equal(normalizeChatVolume(140), 100);
  assert.equal(normalizeChatVolume(70), 70);
});
