import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeWatchProgress,
  parseWatchTimestamp,
  timestampShareUrl,
  updateWatchProgress,
  type WatchProgress,
} from "./watch-progress";

const entry: WatchProgress = {
  video: {
    id: "dQw4w9WgXcQ",
    title: "Video",
    channel: "Channel",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    description: "",
    publishedAt: "",
    embedUrl: "",
    watchUrl: "",
    durationSeconds: 200,
    viewCount: 0,
  },
  positionSeconds: 45,
  durationSeconds: 200,
  updatedAt: 123,
};

test("shared timestamps support seconds and ordered h/m/s, including explicit zero", () => {
  assert.equal(parseWatchTimestamp("90"), 90);
  assert.equal(parseWatchTimestamp("1h2m3s"), 3723);
  assert.equal(parseWatchTimestamp("1m30s"), 90);
  assert.equal(parseWatchTimestamp("0"), 0);
  assert.equal(parseWatchTimestamp(["1", "2"]), null);
  for (const value of [null, "", "-10", "1m2h", "1.5m", "javascript:alert(1)"])
    assert.equal(parseWatchTimestamp(value), null);
  assert.equal(parseWatchTimestamp("999999999"), 604800);
});

test("timestamp links preserve loop preference and replace conflicting timestamps", () => {
  assert.equal(
    timestampShareUrl(
      "https://example.com/watch/dQw4w9WgXcQ?loop=1&t=10&start=99#old",
      72.9,
    ),
    "https://example.com/watch/dQw4w9WgXcQ?loop=1&t=72",
  );
});

test("progress storage ignores malformed records and broken browser storage values", () => {
  assert.deepEqual(decodeWatchProgress("{broken"), []);
  assert.deepEqual(
    decodeWatchProgress(
      JSON.stringify([
        entry,
        null,
        { ...entry, video: { id: "../bad" } },
        { ...entry, positionSeconds: "45" },
      ]),
    ),
    [entry],
  );
});

test("completed videos, live streams and explicit restart disappear from continue watching", () => {
  assert.deepEqual(
    updateWatchProgress([entry], { ...entry, positionSeconds: 195 }),
    [],
  );
  assert.deepEqual(
    updateWatchProgress([entry], { ...entry, durationSeconds: 0 }),
    [],
  );
  assert.deepEqual(
    updateWatchProgress([entry], { ...entry, positionSeconds: 0 }),
    [],
  );
});

test("saving progress updates one record and keeps a bounded recent list", () => {
  assert.equal(
    updateWatchProgress([entry], { ...entry, positionSeconds: 60 }).length,
    1,
  );
  assert.equal(
    updateWatchProgress([entry], { ...entry, positionSeconds: 60 })[0]
      .positionSeconds,
    60,
  );
  const entries = Array.from({ length: 30 }, (_, index) => ({
    ...entry,
    video: { ...entry.video, id: `video-${index}` },
  }));
  assert.equal(updateWatchProgress(entries, entry).length, 30);
});
