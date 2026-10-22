import assert from "node:assert/strict";
import test from "node:test";
import { getSearchSuggestions } from "./search-suggestions";

test("weekly popular keywords fill discovery rows before the editorial catalog", () => {
  const results = getSearchSuggestions("", ["my recent search"], "vi", 6, [
    "nhạc acoustic",
    "nhạc lofi",
  ]);
  assert.deepEqual(results.slice(0, 3), [
    { term: "my recent search", source: "recent" },
    { term: "nhạc acoustic", source: "popular" },
    { term: "nhạc lofi", source: "popular" },
  ]);
  assert.equal(results.filter((item) => item.term === "nhạc lofi").length, 1);
  assert.ok(results.some((item) => item.source === "suggested"));
});

test("weekly keywords match accents and deduplicate against personal history", () => {
  assert.deepEqual(
    getSearchSuggestions("acoustic", ["Nhạc Acoustic"], "vi", 6, [
      "nhạc acoustic",
      "Acoustic covers",
      "unrelated",
    ]),
    [
      { term: "Nhạc Acoustic", source: "recent" },
      { term: "Acoustic covers", source: "popular" },
    ],
  );
  assert.ok(
    getSearchSuggestions("am nhac", [], "vi", 6, ["Âm nhạc thư giãn"]).some(
      (item) => item.source === "popular",
    ),
  );
});

test("empty input offers recent searches alongside localized discovery keywords", () => {
  const results = getSearchSuggestions(
    "  ",
    ["one topic", "two topics", "three topics", "four topics"],
    "vi",
  );
  assert.equal(results.length, 6);
  assert.deepEqual(results.slice(0, 3), [
    { term: "one topic", source: "recent" },
    { term: "two topics", source: "recent" },
    { term: "three topics", source: "recent" },
  ]);
  assert.equal(results[3].source, "suggested");
  assert.ok(results.some((item) => item.term === "nhạc lofi"));
  assert.ok(
    getSearchSuggestions("", [], "te").some((item) =>
      /తెలుగు/u.test(item.term),
    ),
  );
});

test("Vietnamese matching ignores casing, accents and đ without changing display text", () => {
  assert.deepEqual(getSearchSuggestions("  DUONG  ", ["Đường về nhà"], "vi"), [
    { term: "Đường về nhà", source: "recent" },
  ]);
  assert.ok(
    getSearchSuggestions("NHAC", [], "vi").some(
      (item) => item.term === "nhạc lofi",
    ),
  );
  assert.deepEqual(
    getSearchSuggestions("a\u0302m nha\u0323c", ["Âm nhạc hay"], "vi"),
    [{ term: "Âm nhạc hay", source: "recent" }],
  );
});

test("prefixes rank ahead of substrings within history while recent matches stay first", () => {
  const results = getSearchSuggestions(
    "react",
    ["Learn React fast", "React hooks", "React basics"],
    "en",
  );
  assert.deepEqual(
    results.map((item) => item.term),
    ["React hooks", "React basics", "Learn React fast", "React tutorial"],
  );
});

test("multiword matching tolerates word order and normalizes spaces", () => {
  assert.deepEqual(
    getSearchSuggestions("music   piano", ["  piano  music  "], "en"),
    [{ term: "piano music", source: "recent" }],
  );
  assert.deepEqual(
    getSearchSuggestions("unrelated keyword", ["piano music"], "en"),
    [],
  );
});

test("case and accent variants are deduplicated across history and the catalog", () => {
  const results = getSearchSuggestions(
    "nhac",
    [" NHẠC   LOFI ", "nhac lofi", "Nhạc Lofi", "nhạc Việt mới"],
    "vi",
  );
  assert.equal(results.filter((item) => /lofi/i.test(item.term)).length, 1);
  assert.equal(results[0].term, "NHẠC LOFI");
  assert.equal(results[0].source, "recent");
});

test("Telugu vowel signs remain meaningful and catalog display text is preserved", () => {
  assert.ok(getSearchSuggestions("పాటలు", [], "te").length > 0);
  assert.deepEqual(getSearchSuggestions("వంట", ["వీంట"], "te"), [
    { term: "సులభమైన వంటలు", source: "suggested" },
  ]);
  assert.ok(
    getSearchSuggestions("React", [], "te").some(
      (item) => item.term === "React tutorial",
    ),
  );
  assert.ok(
    getSearchSuggestions("lofi", [], "vi").some(
      (item) => item.term === "lofi học bài",
    ),
  );
});

test("video IDs and URL-looking queries never produce keyword suggestions", () => {
  for (const query of [
    "dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "youtu.be/dQw4w9WgXcQ",
    "youtube.com/shorts/",
    "https:",
    "www.",
    "example.com/watch",
    "//example.com",
    "javascript:alert(1)",
  ]) {
    assert.deepEqual(
      getSearchSuggestions(query, [query + " music"], "en"),
      [],
      query,
    );
  }
});

test("malformed or URL-like history is ignored without mutating caller data", () => {
  const recent = [
    "",
    "x",
    "   ",
    "!!!",
    null,
    42,
    "https://example.com",
    "youtu.be/dQw4w9WgXcQ",
    "dQw4w9WgXcQ",
    "valid topic",
    "bad\u0000term",
    "a".repeat(501),
  ] as unknown as string[];
  const original = [...recent];
  assert.deepEqual(
    getSearchSuggestions("", recent, "en")
      .filter((item) => item.source === "recent")
      .map((item) => item.term),
    ["valid topic"],
  );
  assert.deepEqual(recent, original);
});

test("result limits are bounded and an empty history still fills the discovery list", () => {
  assert.equal(getSearchSuggestions("", [], "en", 0).length, 0);
  assert.equal(getSearchSuggestions("", [], "en", -1).length, 0);
  assert.equal(getSearchSuggestions("", [], "en", 1000).length, 8);
  assert.equal(getSearchSuggestions("", [], "en", 2.9).length, 2);
  assert.equal(getSearchSuggestions("", [], "en", NaN).length, 6);
  assert.equal(getSearchSuggestions("", ["a topic"], "en", 4).length, 4);
  assert.deepEqual(getSearchSuggestions("a".repeat(501), [], "en"), []);
});

test("long recent searches remain complete when offered as suggestions", () => {
  const term = "A long tutorial search ".repeat(20).trim();
  assert.ok(term.length > 200 && term.length < 500);
  assert.deepEqual(getSearchSuggestions(term, [term], "en"), [
    { term, source: "recent" },
  ]);
});
