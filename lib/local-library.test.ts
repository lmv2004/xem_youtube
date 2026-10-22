import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_WATCH_LATER_ITEMS,
  moveWatchLater,
  normalizeRecentSearches,
  normalizeWatchLater,
} from "./local-library";

const video = (id: string) => ({
  id,
  title: "A saved video",
  channel: "Channel",
});

test("stored watch-later entries are validated, deduplicated, repaired and capped", () => {
  assert.deepEqual(normalizeWatchLater(null), []);
  const items = normalizeWatchLater([
    null,
    {},
    { id: "bad" },
    video("first"),
    video("first"),
    {
      ...video("second"),
      thumbnail: "javascript:alert(1)",
      durationSeconds: -4,
      viewCount: NaN,
    },
    ...Array.from({ length: 110 }, (_, index) => video("video-" + index)),
  ]);
  assert.equal(items.length, MAX_WATCH_LATER_ITEMS);
  assert.equal(items[0].id, "first");
  assert.equal(items[1].id, "second");
  assert.equal(items[1].durationSeconds, 0);
  assert.equal(items[1].thumbnail, "");
  assert.equal(items[1].viewCount, 0);
  assert.equal(items[0].watchUrl, "https://www.youtube.com/watch?v=first");
});

test("stored video metadata and unavailable embed status are preserved", () => {
  const [item] = normalizeWatchLater([
    {
      ...video("first"),
      thumbnail: "https://i.ytimg.com/vi/first/hqdefault.jpg",
      description: "Original description",
      durationSeconds: 123,
      viewCount: 42,
      embeddable: false,
    },
  ]);
  assert.equal(item.description, "Original description");
  assert.equal(item.durationSeconds, 123);
  assert.equal(item.viewCount, 42);
  assert.equal(item.embeddable, false);
});

test("watch-later reorder is immutable and respects list boundaries", () => {
  const items = normalizeWatchLater([
    video("one"),
    video("two"),
    video("three"),
  ]);
  assert.deepEqual(
    moveWatchLater(items, "two", -1).map((item) => item.id),
    ["two", "one", "three"],
  );
  assert.deepEqual(
    moveWatchLater(items, "two", 1).map((item) => item.id),
    ["one", "three", "two"],
  );
  assert.equal(moveWatchLater(items, "one", -1), items);
  assert.equal(moveWatchLater(items, "missing", 1), items);
  assert.deepEqual(
    items.map((item) => item.id),
    ["one", "two", "three"],
  );
});

test("recent search repair trims, caps and deduplicates without changing display casing", () => {
  assert.deepEqual(normalizeRecentSearches({}), []);
  assert.deepEqual(
    normalizeRecentSearches([
      "  Music  ",
      "music",
      null,
      42,
      "",
      "a",
      "Coding",
    ]),
    ["Music", "Coding"],
  );
  assert.equal(
    normalizeRecentSearches(
      Array.from({ length: 20 }, (_, index) => "search " + index),
    ).length,
    8,
  );
  assert.equal(normalizeRecentSearches(["a".repeat(500)])[0].length, 500);
  assert.deepEqual(normalizeRecentSearches(["a".repeat(501)]), []);
  const prefix = "a long search title ".repeat(15);
  const distinctTerms = [prefix + "original version", prefix + "live version"];
  assert.deepEqual(normalizeRecentSearches(distinctTerms), distinctTerms);
});
