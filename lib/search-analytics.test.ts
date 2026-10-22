import test from "node:test";
import assert from "node:assert/strict";
import {
  analyticsRetentionStart,
  analyticsWindowStart,
  createVisitorCookie,
  eventDeduplicationKey,
  isSameOriginSearchRequest,
  normalizeAnalyticsKeyword,
  parseSearchEvent,
  verifyVisitorCookie,
  visitorIdentifier,
} from "./search-analytics";

const UUID = "0726bbca-5b3b-46a0-a0f2-6789af62d5e1";
const secret = "test-search-secret-not-for-production";

test("analytics validates locale, event identity and bounded input", () => {
  const valid = { keyword: "lofi music", locale: "en", eventId: UUID };
  assert.deepEqual(parseSearchEvent(valid), valid);
  assert.equal(parseSearchEvent({ ...valid, locale: "fr" }), null);
  assert.equal(parseSearchEvent({ ...valid, eventId: "anything" }), null);
  assert.equal(parseSearchEvent({ ...valid, keyword: "a".repeat(201) }), null);
  assert.equal(parseSearchEvent({ ...valid, keyword: ["lofi"] }), null);
  assert.equal(parseSearchEvent(null), null);
});

test("analytics merges case and Vietnamese accents while preserving readable terms and Telugu vowel signs", () => {
  assert.deepEqual(normalizeAnalyticsKeyword("  NHẠC   ĐỎ  "), {
    normalized: "nhac do",
    display: "NHẠC ĐỎ",
  });
  assert.equal(normalizeAnalyticsKeyword("nhac do")?.normalized, "nhac do");
  assert.deepEqual(normalizeAnalyticsKeyword("తెలుగు పాటలు"), {
    normalized: "తెలుగు పాటలు",
    display: "తెలుగు పాటలు",
  });
  assert.notEqual(
    normalizeAnalyticsKeyword("కల")?.normalized,
    normalizeAnalyticsKeyword("కాల")?.normalized,
  );
});

test("private-looking input, video IDs, URLs and control characters never enter analytics", () => {
  for (const keyword of [
    "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "www.example.com",
    "example.dev/path",
    "email me user@example.com",
    "mailto:user@example.com",
    "dQw4w9WgXcQ",
    "+84 987 654 321",
    "call (212) 555-1212",
    "nhạc\nlofi",
    "a\u0000bc",
    "😀",
    "x",
  ])
    assert.equal(normalizeAnalyticsKeyword(keyword), null, keyword);
  for (const keyword of [
    "iphone 15",
    "f1 2025 highlights",
    "React.js tutorial",
    "lofi study music",
  ])
    assert.ok(normalizeAnalyticsKeyword(keyword), keyword);
});

test("window and retention use exact hours rather than calendar dates or locale timezones", () => {
  const now = new Date("2026-10-22T14:37:28.123Z");
  assert.equal(
    analyticsWindowStart(now).toISOString(),
    "2026-10-15T14:37:28.123Z",
  );
  assert.equal(
    analyticsRetentionStart(now).toISOString(),
    "2026-10-08T14:37:28.123Z",
  );
});

test("visitor cookies are signed, tamper resistant and independent of accounts", () => {
  const cookie = createVisitorCookie(secret, UUID);
  assert.equal(verifyVisitorCookie(cookie, secret), UUID);
  assert.equal(verifyVisitorCookie(cookie, "other secret"), null);
  assert.equal(
    verifyVisitorCookie(
      cookie.replace(UUID, "1726bbca-5b3b-46a0-a0f2-6789af62d5e1"),
      secret,
    ),
    null,
  );
  for (const invalid of [
    undefined,
    "",
    "bad.signature",
    `${cookie}.extra`,
    "x".repeat(10000),
  ])
    assert.equal(verifyVisitorCookie(invalid, secret), null);
  const visitor = visitorIdentifier(UUID, secret);
  assert.match(visitor, /^[a-f0-9]{64}$/);
  assert.equal(visitorIdentifier(UUID, secret), visitor);
  assert.notEqual(visitorIdentifier(UUID, "rotated secret"), visitor);
  assert.ok(!cookie.includes(visitor));
});

test("dedupe isolates locale and visitor, and repeats only after a fixed five minute bucket", () => {
  const visitor = visitorIdentifier(UUID, secret);
  const first = new Date("2026-10-22T14:35:00.000Z");
  const key = eventDeduplicationKey(visitor, "lofi music", "en", first);
  assert.equal(
    eventDeduplicationKey(
      visitor,
      "lofi music",
      "en",
      new Date("2026-10-22T14:39:59.999Z"),
    ),
    key,
  );
  assert.notEqual(
    eventDeduplicationKey(
      visitor,
      "lofi music",
      "en",
      new Date("2026-10-22T14:40:00.000Z"),
    ),
    key,
  );
  assert.notEqual(
    eventDeduplicationKey(visitor, "lofi music", "vi", first),
    key,
  );
  assert.notEqual(
    eventDeduplicationKey("a".repeat(64), "lofi music", "en", first),
    key,
  );
  assert.notEqual(
    eventDeduplicationKey(visitor, "relaxing music", "en", first),
    key,
  );
});

test("recording accepts only same-origin browser writes", () => {
  const make = (origin?: string, site?: string) =>
    new Request("https://preview.example.app/api/searches", {
      headers: {
        ...(origin ? { Origin: origin } : {}),
        ...(site ? { "Sec-Fetch-Site": site } : {}),
      },
    });
  assert.ok(
    isSameOriginSearchRequest(
      make("https://preview.example.app", "same-origin"),
    ),
  );
  assert.equal(
    isSameOriginSearchRequest(make("https://evil.example", "cross-site")),
    false,
  );
  assert.equal(
    isSameOriginSearchRequest(
      make("https://preview.example.app", "cross-site"),
    ),
    false,
  );
  assert.equal(isSameOriginSearchRequest(make()), false);
  assert.equal(isSameOriginSearchRequest(make("null")), false);
  assert.equal(
    isSameOriginSearchRequest(make("http://preview.example.app")),
    false,
  );
});

test("same-origin checks preserve original Host after NextRequest loopback normalization", () => {
  const make = (host: string, origin = "http://127.0.0.1:3100") =>
    new Request("http://localhost:3100/api/searches", {
      headers: { Host: host, Origin: origin },
    });
  assert.ok(isSameOriginSearchRequest(make("127.0.0.1:3100")));
  assert.equal(
    isSameOriginSearchRequest(
      make("127.0.0.1:3100", "http://attacker.example"),
    ),
    false,
  );
  assert.equal(
    isSameOriginSearchRequest(make("127.0.0.1:3100", "http://127.0.0.1:3200")),
    false,
  );
  assert.equal(
    isSameOriginSearchRequest(make("127.0.0.1:3100", "https://127.0.0.1:3100")),
    false,
  );
  assert.equal(
    isSameOriginSearchRequest(make("127.0.0.1:3100", "http://localhost:3100")),
    false,
  );
  assert.ok(
    isSameOriginSearchRequest(make("localhost:3100", "http://localhost:3100")),
  );
  for (const host of [
    "attacker@127.0.0.1:3100",
    "127.0.0.1:3100/path",
    "127.0.0.1:3100?x=y",
    "127.0.0.1:3100#hash",
    "127.0.0.1:3100,attacker.example",
    "127.0.0.1:999999",
    "http://127.0.0.1:3100",
  ])
    assert.equal(isSameOriginSearchRequest(make(host)), false, host);
  assert.equal(
    isSameOriginSearchRequest(
      make("127.0.0.1:3100", "http://attacker@127.0.0.1:3100"),
    ),
    false,
  );
  assert.equal(
    isSameOriginSearchRequest(
      make("127.0.0.1:3100", "http://127.0.0.1:3100/path"),
    ),
    false,
  );
});
