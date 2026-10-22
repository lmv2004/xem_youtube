import assert from "node:assert/strict";
import test from "node:test";
import {
  getSearchDestination,
  parseVideoSearchQuery,
  SEARCH_MAX_LENGTH,
} from "./search-query";

test("full Vietnamese, English and Telugu searches retain their ending", () => {
  for (const term of [
    "fishy VẾT THƯƠNG official music video phiên bản đầy đủ",
    "React tutorial for beginners with TypeScript and accessibility",
    "తెలుగు పాటలు ప్రశాంతమైన సంగీతం కొత్త తెలుగు పాటలు",
    "🎵 ".repeat(124) + "ending",
  ]) {
    const parsed = parseVideoSearchQuery(`  ${term}  `, null);
    assert.equal(parsed?.query, term);
    assert.equal(parsed?.label, term);
    const destination = getSearchDestination(`  ${term}  `);
    assert.equal(destination?.keyword, term);
    assert.equal(
      new URL(destination!.href, "https://example.test").searchParams.get("topic"),
      term,
    );
  }
});

test("interests and the user's entire topic survive the combined query", () => {
  const topic = "x".repeat(SEARCH_MAX_LENGTH);
  const interests = Array.from({ length: 4 }, (_, i) => `${i}`.repeat(100));
  const parsed = parseVideoSearchQuery(topic, interests.join(","));
  assert.deepEqual(parsed?.interests, interests);
  assert.equal(parsed?.query, [...interests, topic].join(" | "));
  assert.equal(parsed?.label, [...interests, topic].join(", "));
});

test("requests outside explicit bounds are rejected rather than truncated", () => {
  assert.equal(
    parseVideoSearchQuery("x".repeat(SEARCH_MAX_LENGTH + 1), null),
    null,
  );
  assert.equal(getSearchDestination("x".repeat(SEARCH_MAX_LENGTH + 1)), null);
  assert.equal(parseVideoSearchQuery("music", "x".repeat(101)), null);
  assert.equal(parseVideoSearchQuery("music", "aa,bb,cc,dd,ee"), null);
  assert.equal(parseVideoSearchQuery("a", null), null);
  assert.equal(
    parseVideoSearchQuery("x".repeat(SEARCH_MAX_LENGTH), null)?.query.length,
    SEARCH_MAX_LENGTH,
  );
  assert.deepEqual(parseVideoSearchQuery("  ", " , music, a, , coding "), {
    topic: "",
    interests: ["music", "coding"],
    query: "music | coding",
    label: "music, coding",
  });
  assert.equal(getSearchDestination("a"), null);
  assert.equal(getSearchDestination(" "), null);
});

test("video URLs and bare IDs open the player without recording a search keyword", () => {
  for (const value of [
    "dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5",
    "https://youtu.be/dQw4w9WgXcQ",
    "youtube.com/shorts/dQw4w9WgXcQ",
  ]) {
    assert.deepEqual(getSearchDestination(value), {
      href: "/watch/dQw4w9WgXcQ",
      keyword: null,
    });
  }
});
