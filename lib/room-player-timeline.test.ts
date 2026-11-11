import test from "node:test";
import assert from "node:assert/strict";
import { boundedRoomPosition, createRoomPlayerTimeline, roomEndDuration } from "./room-player-timeline";

test("live streams keep their native timeline, including broadcasts older than a day", () => {
  const timeline = createRoomPlayerTimeline();
  assert.equal(timeline.observe(200_000, 0, true, 0), "live");
  assert.equal(timeline.observe(200_001, 0, false, 1000), "live");
  timeline.reset();
  assert.equal(timeline.observe(180, 180, false, 2000), "video");
});

test("a growing YouTube duration identifies live without optional player metadata", () => {
  const timeline = createRoomPlayerTimeline();
  assert.equal(timeline.observe(0, 0, false, 0), "unknown");
  assert.equal(timeline.observe(3600, 0, false, 1000), "unknown");
  assert.equal(timeline.observe(3602, 0, false, 3000), "live");
});

test("unknown direct-link videos wait for a stable duration before seeking", () => {
  const timeline = createRoomPlayerTimeline();
  assert.equal(timeline.observe(180, 0, false, 0), "unknown");
  assert.equal(timeline.observe(180, 0, false, 5999), "unknown");
  assert.equal(timeline.observe(180, 0, false, 6000), "video");
});

test("loading a longer VOD duration is not evidence of a live broadcast", () => {
  const timeline = createRoomPlayerTimeline();
  timeline.observe(20, 0, false, 0);
  assert.equal(timeline.observe(180, 0, false, 1000), "unknown");
  assert.equal(timeline.observe(180, 0, false, 7000), "video");
});

test("stale room targets stay within the actual VOD duration", () => {
  assert.equal(boundedRoomPosition(500_000, 180), 180);
  assert.equal(boundedRoomPosition(-1, 180), 0);
  assert.equal(boundedRoomPosition(NaN, 180), 0);
  assert.equal(boundedRoomPosition(45, 0), 45);
});

test("a completed long broadcast reports room elapsed time, not broadcast age", () => {
  assert.equal(roomEndDuration(200_000, true, 90), 90);
  assert.equal(roomEndDuration(180, false, 90), 180);
  assert.equal(roomEndDuration(200_000, true, 100_000), 86_400);
});
