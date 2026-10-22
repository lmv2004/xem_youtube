import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { prisma } from "../lib/db";
import {
  analyticsRetentionStart,
  analyticsWindowStart,
  normalizeAnalyticsKeyword,
  SEARCH_DEDUPE_MS,
  SEARCH_HOURLY_LIMIT,
  SEARCH_VISITOR_COOKIE,
  SEARCH_VISITOR_MAX_AGE,
  verifyVisitorCookie,
  visitorIdentifier,
  type PopularSearches,
} from "../lib/search-analytics";
import {
  readPopularSearches,
  recordSearchEvent,
} from "../lib/search-analytics-store";
import type { Locale } from "../lib/locale";

after(async () => {
  await prisma.$disconnect();
});

const AUTH_SECRET = "search-integration-test-only-secret-32-bytes";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const searchVisitorCookies = (response: Response) =>
  response.headers
    .getSetCookie()
    .filter((cookie) => cookie.startsWith(`${SEARCH_VISITOR_COOKIE}=`));

async function withProductionServer(
  run: (origin: string) => Promise<void>,
  environment: Partial<NodeJS.ProcessEnv> = {},
): Promise<void> {
  const portServer = createServer();
  await new Promise<void>((resolve) =>
    portServer.listen(0, "127.0.0.1", resolve),
  );
  const address = portServer.address();
  assert.ok(address && typeof address !== "string");
  await new Promise<void>((resolve) => portServer.close(() => resolve()));
  const origin = `http://localhost:${address.port}`;
  let output = "";
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(address.port)],
    {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        ...environment,
        NODE_ENV: "production",
        AUTH_URL: origin,
        AUTH_TRUST_HOST: "true",
        AUTH_SECRET,
      },
    },
  );
  server.stdout.on("data", (data) => {
    output = (output + data).slice(-4000);
  });
  server.stderr.on("data", (data) => {
    output = (output + data).slice(-4000);
  });
  const exited = new Promise<void>((resolve) =>
    server.once("exit", () => resolve()),
  );
  try {
    let started = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (server.exitCode !== null)
        throw new Error(`Next server exited: ${output}`);
      try {
        // An invalid locale proves the route is ready without touching DB/cache.
        const response = await fetch(`${origin}/api/searches?locale=invalid`, {
          signal: AbortSignal.timeout(1000),
        });
        if (response.status === 400) {
          started = true;
          break;
        }
      } catch {
        /* Wait for the production server to listen. */
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(started, `Next server failed to start: ${output}`);
    await run(origin);
  } finally {
    server.kill();
    await exited;
  }
}

test(
  "weekly search analytics persist, deduplicate, rank and fail independently of video search",
  {
    skip: process.env.SEARCH_ANALYTICS_INTEGRATION !== "1",
    timeout: 180_000,
  },
  async (t) => {
    // Alphabetic tokens cannot accidentally look like private phone numbers.
    const token = randomUUID()
      .slice(0, 8)
      .replace(/\d/g, (digit) => "abcdefghij"[Number(digit)]);
    const prefix = `weekly ${token}`;
    const eventIds = new Set<string>();
    const now = new Date();
    const visitor = (name: string) => hash(`${prefix}:${name}`);
    const nextEventId = () => {
      const eventId = randomUUID();
      eventIds.add(eventId);
      return eventId;
    };
    const createEvent = async (
      term: string,
      createdAt: Date,
      visitorName: string,
      locale: Locale = "vi",
      normalizedTerm?: string,
    ) => {
      const keyword = normalizeAnalyticsKeyword(term);
      assert.ok(keyword, "Integration fixture must be a publishable keyword");
      return prisma.searchEvent.create({
        data: {
          eventId: nextEventId(),
          dedupeKey: hash(randomUUID()),
          visitorId: visitor(visitorName),
          normalizedKeyword: normalizedTerm ?? keyword.normalized,
          displayKeyword: keyword.display,
          locale,
          createdAt,
        },
      });
    };
    const user = await prisma.user.create({
      data: {
        email: `${randomUUID()}@example.invalid`,
        name: "Search retention fixture",
        createdAt: new Date(now.getTime() - 30 * 86_400_000),
      },
    });
    try {
      await t.test(
        "retention deletes only expired analytics and preserves the exact boundary",
        async () => {
          const retentionStart = analyticsRetentionStart(now);
          const expired = await createEvent(
            `${prefix} expired`,
            new Date(retentionStart.getTime() - 1),
            "expired",
          );
          const boundary = await createEvent(
            `${prefix} retention boundary`,
            retentionStart,
            "boundary",
          );
          const recent = await createEvent(
            `${prefix} retained`,
            now,
            "retained",
          );
          const result = await recordSearchEvent(
            {
              keyword: `${prefix} maintenance`,
              locale: "vi",
              eventId: nextEventId(),
            },
            visitor("maintenance"),
            { now },
          );
          assert.deepEqual(result, { recorded: true, reason: "recorded" });
          assert.equal(
            await prisma.searchEvent.findUnique({
              where: { eventId: expired.eventId },
            }),
            null,
          );
          assert.ok(
            await prisma.searchEvent.findUnique({
              where: { eventId: boundary.eventId },
            }),
          );
          assert.ok(
            await prisma.searchEvent.findUnique({
              where: { eventId: recent.eventId },
            }),
          );
          assert.ok(await prisma.user.findUnique({ where: { id: user.id } }));
        },
      );

      await t.test(
        "trailing seven days include the exact start, exclude older/future rows, and isolate locale",
        async () => {
          const term = `${prefix} rolling window`;
          const currentTerm = `${prefix} current boundary`;
          const expiredTerm = `${prefix} expired window`;
          const futureTerm = `${prefix} future window`;
          const start = analyticsWindowStart(now);
          await createEvent(term, start, "window-boundary-a");
          await createEvent(term, start, "window-boundary-b");
          await createEvent(term, now, "window-current");
          // Independent terms cannot hide a missing boundary event by admitting
          // an old/future event with an accidentally equal overall count.
          for (const visitorName of ["a", "b"]) {
            await createEvent(currentTerm, now, `current-${visitorName}`);
            await createEvent(
              expiredTerm,
              new Date(start.getTime() - 1),
              `expired-${visitorName}`,
            );
            await createEvent(
              futureTerm,
              new Date(now.getTime() + 1),
              `future-${visitorName}`,
            );
          }
          await createEvent(term, now, "english-a", "en");
          await createEvent(term, now, "english-b", "en");
          await createEvent(term, now, "english-c", "en");
          await createEvent(term, now, "english-d", "en");
          const vi = await readPopularSearches("vi", now);
          const en = await readPopularSearches("en", now);
          assert.equal(vi.windowDays, 7);
          assert.equal(vi.updatedAt, now.toISOString());
          assert.deepEqual(
            vi.items.find((item) => item.term === term),
            { term, count: 3 },
          );
          assert.deepEqual(
            vi.items.find((item) => item.term === currentTerm),
            { term: currentTerm, count: 2 },
          );
          assert.equal(
            vi.items.some((item) => item.term === expiredTerm),
            false,
          );
          assert.equal(
            vi.items.some((item) => item.term === futureTerm),
            false,
          );
          assert.deepEqual(
            en.items.find((item) => item.term === term),
            { term, count: 4 },
          );
        },
      );

      await t.test(
        "ranking uses real counts, deterministic ties/spellings and at least two visitors",
        async () => {
          const highest = `${prefix} highest`;
          const alpha = `${prefix} alpha`;
          const beta = `${prefix} beta`;
          const privateTerm = `${prefix} single visitor`;
          for (let index = 0; index < 4; index++)
            await createEvent(highest, now, `highest-${index}`);
          for (const term of [beta, alpha]) {
            await createEvent(term, now, `${term}-a`);
            await createEvent(term, now, `${term}-b`);
          }
          for (let index = 0; index < 5; index++)
            await createEvent(privateTerm, now, "private-same");
          const lower = `${prefix} display spelling`;
          const upper = lower.toUpperCase();
          const normalized = normalizeAnalyticsKeyword(lower)!.normalized;
          await createEvent(lower, now, "spelling-a", "vi", normalized);
          await createEvent(upper, now, "spelling-b", "vi", normalized);
          const result = await readPopularSearches("vi", now);
          assert.deepEqual(
            result.items.find((item) => item.term === highest),
            { term: highest, count: 4 },
          );
          assert.equal(
            result.items.some((item) => item.term === privateTerm),
            false,
          );
          assert.ok(
            result.items.findIndex((item) => item.term === highest) <
              result.items.findIndex((item) => item.term === alpha),
          );
          assert.ok(
            result.items.findIndex((item) => item.term === alpha) <
              result.items.findIndex((item) => item.term === beta),
          );
          assert.deepEqual(
            result.items.find((item) => item.term.toLowerCase() === lower),
            { term: upper, count: 2 },
          );
        },
      );

      await t.test(
        "weekly rankings return only the ten highest-count keywords",
        async () => {
          const keywords = Array.from({ length: 12 }, (_, index) => ({
            term: `${prefix} top keyword ${index}`,
            count: index + 2,
          }));
          for (const { term, count } of keywords) {
            for (let index = 0; index < count; index++) {
              await createEvent(term, now, `${term}-visitor-${index}`, "te");
            }
          }
          const result = await readPopularSearches("te", now);
          const expected = keywords
            .slice()
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
          assert.equal(result.items.length, 10);
          assert.deepEqual(result.items, expected);
          assert.deepEqual(
            result.items.map((item) => item.count),
            [13, 12, 11, 10, 9, 8, 7, 6, 5, 4],
          );
        },
      );

      await t.test(
        "concurrent requests deduplicate event IDs and visitor/keyword buckets",
        async () => {
          const bucketStart = new Date(
            Math.floor(now.getTime() / SEARCH_DEDUPE_MS) * SEARCH_DEDUPE_MS,
          );
          const eventId = nextEventId();
          const term = `${prefix} concurrent event`;
          const sameEvent = await Promise.all(
            Array.from({ length: 6 }, () =>
              recordSearchEvent(
                {
                  keyword: term,
                  locale: "vi",
                  eventId,
                },
                visitor("concurrent-event"),
                { now: bucketStart },
              ),
            ),
          );
          assert.equal(sameEvent.filter((result) => result.recorded).length, 1);
          assert.equal(
            await prisma.searchEvent.count({ where: { eventId } }),
            1,
          );
          const sharedEventId = nextEventId();
          const crossVisitorRace = await Promise.all(
            Array.from({ length: 6 }, (_, index) =>
              recordSearchEvent(
                {
                  keyword: `${prefix} cross visitor event`,
                  locale: "vi",
                  eventId: sharedEventId,
                },
                visitor(`cross-visitor-${index}`),
                { now: bucketStart },
              ),
            ),
          );
          assert.equal(
            crossVisitorRace.filter((result) => result.recorded).length,
            1,
          );
          assert.equal(
            await prisma.searchEvent.count({
              where: { eventId: sharedEventId },
            }),
            1,
          );
          const bucketTerm = `${prefix} nhạc concurrent keyword`;
          const normalizedBucketTerm =
            normalizeAnalyticsKeyword(bucketTerm)!.normalized;
          const sameBucket = await Promise.all(
            Array.from({ length: 6 }, (_, index) =>
              recordSearchEvent(
                {
                  keyword:
                    index % 2 ? normalizedBucketTerm.toUpperCase() : bucketTerm,
                  locale: "vi",
                  eventId: nextEventId(),
                },
                visitor("concurrent-keyword"),
                { now: bucketStart },
              ),
            ),
          );
          assert.equal(
            sameBucket.filter((result) => result.recorded).length,
            1,
          );
          assert.equal(
            await prisma.searchEvent.count({
              where: {
                visitorId: visitor("concurrent-keyword"),
                normalizedKeyword: normalizedBucketTerm,
              },
            }),
            1,
          );
          assert.deepEqual(
            await recordSearchEvent(
              { keyword: term, locale: "vi", eventId },
              visitor("concurrent-event"),
              { now: new Date(bucketStart.getTime() + SEARCH_DEDUPE_MS + 1) },
            ),
            { recorded: false, reason: "duplicate" },
          );
          assert.equal(
            await prisma.searchEvent.count({ where: { eventId } }),
            1,
          );
          // A genuinely new submit in a later fixed bucket is allowed.
          assert.equal(
            (
              await recordSearchEvent(
                { keyword: bucketTerm, locale: "vi", eventId: nextEventId() },
                visitor("concurrent-keyword"),
                { now: new Date(bucketStart.getTime() + SEARCH_DEDUPE_MS) },
              )
            ).recorded,
            true,
          );
        },
      );

      await t.test(
        "per-visitor abuse limit is enforced atomically",
        async () => {
          const visitorId = visitor("rate-limited");
          for (let index = 0; index < SEARCH_HOURLY_LIMIT - 1; index++) {
            await createEvent(
              `${prefix} rate seed ${index}`,
              now,
              "rate-limited",
            );
          }
          const results = await Promise.all(
            Array.from({ length: 4 }, (_, index) =>
              recordSearchEvent(
                {
                  keyword: `${prefix} rate attempt ${index}`,
                  locale: "vi",
                  eventId: nextEventId(),
                },
                visitorId,
                { now },
              ),
            ),
          );
          assert.equal(results.filter((result) => result.recorded).length, 1);
          assert.equal(
            results.filter((result) => result.reason === "rate-limited").length,
            3,
          );
          assert.equal(
            await prisma.searchEvent.count({ where: { visitorId } }),
            SEARCH_HOURLY_LIMIT,
          );
        },
      );

      await t.test(
        "unavailable analytics return a recoverable failure without video API calls",
        async () => {
          await withProductionServer(
            async (origin) => {
              const response = await fetch(`${origin}/api/searches?locale=te`, {
                signal: AbortSignal.timeout(15_000),
              });
              assert.equal(response.status, 503);
              assert.match(
                response.headers.get("cache-control") ?? "",
                /no-store/,
              );
              assert.deepEqual(await response.json(), {
                message: "Search trends are temporarily unavailable.",
              });
              const write = await fetch(`${origin}/api/searches`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Origin: origin },
                body: JSON.stringify({
                  keyword: `${prefix} unavailable`,
                  locale: "te",
                  eventId: nextEventId(),
                }),
                signal: AbortSignal.timeout(15_000),
              });
              assert.equal(write.status, 503);
              assert.equal(searchVisitorCookies(write).length, 0);
            },
            {
              DATABASE_URL:
                "postgresql://postgres@127.0.0.1:1/search_analytics_unavailable?connect_timeout=1",
            },
          );
        },
      );

      await t.test(
        "HTTP routes validate writes, preserve anonymous identity and expose real ranked data",
        async () => {
          // Keep cached public rankings from prior local test runs out of this fixture.
          // application_name changes only the connection label, never the database/schema.
          const databaseUrl = new URL(process.env.DATABASE_URL!);
          databaseUrl.searchParams.set(
            "application_name",
            `search-integration-${randomUUID()}`,
          );
          await withProductionServer(
            async (origin) => {
              const post = (
                body: unknown,
                headers: Record<string, string> = {},
              ) =>
                fetch(`${origin}/api/searches`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Origin: origin,
                    ...headers,
                  },
                  body: JSON.stringify(body),
                  signal: AbortSignal.timeout(15_000),
                });
              const event = (keyword = `${prefix} http ranking`) => ({
                keyword,
                locale: "en",
                eventId: nextEventId(),
              });
              assert.equal(
                (await post(event(), { Origin: "https://attacker.example" }))
                  .status,
                403,
              );
              assert.equal(
                (await post(event(), { "Sec-Fetch-Site": "cross-site" }))
                  .status,
                403,
              );
              assert.equal(
                (await post(event(), { "Content-Type": "text/plain" })).status,
                415,
              );
              assert.equal(
                (
                  await post({
                    keyword: "x",
                    locale: "en",
                    eventId: randomUUID(),
                  })
                ).status,
                400,
              );
              assert.equal(
                (await post({ ...event(), locale: "invalid" })).status,
                400,
              );
              assert.equal(
                (await post({ ...event(), eventId: "invalid" })).status,
                400,
              );
              assert.equal(
                (await post({ ...event(), keyword: "a".repeat(2100) })).status,
                413,
              );
              const invalidJson = await fetch(`${origin}/api/searches`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Origin: origin },
                body: "{invalid",
              });
              assert.equal(invalidJson.status, 400);
              const ignored = await post(
                event("private.person@example.invalid"),
              );
              assert.equal(ignored.status, 204);
              assert.equal(searchVisitorCookies(ignored).length, 0);

              const first = event();
              const response = await post(first, {
                "X-Forwarded-For": "198.51.100.42",
              });
              assert.equal(response.status, 204);
              const setCookie = response.headers
                .getSetCookie()
                .find((cookie) =>
                  cookie.startsWith(`${SEARCH_VISITOR_COOKIE}=`),
                );
              assert.ok(setCookie);
              assert.match(setCookie, /; HttpOnly/i);
              assert.match(setCookie, /; SameSite=lax/i);
              assert.match(setCookie, /; Path=\/api\/searches(?:;|$)/i);
              assert.match(
                setCookie,
                new RegExp(`; Max-Age=${SEARCH_VISITOR_MAX_AGE}(?:;|$)`, "i"),
              );
              assert.doesNotMatch(
                setCookie,
                /; Secure(?:;|$)/i,
                "HTTP local server must not issue unusable Secure cookies",
              );
              const cookieHeader = setCookie.split(";", 1)[0];
              const cookieValue = decodeURIComponent(
                cookieHeader.slice(cookieHeader.indexOf("=") + 1),
              );
              const anonymousId = verifyVisitorCookie(cookieValue, AUTH_SECRET);
              assert.ok(anonymousId);
              const row = await prisma.searchEvent.findUniqueOrThrow({
                where: { eventId: first.eventId },
              });
              assert.equal(
                row.visitorId,
                visitorIdentifier(anonymousId, AUTH_SECRET),
              );
              assert.match(row.visitorId, /^[a-f0-9]{64}$/);
              assert.notEqual(row.visitorId, anonymousId);
              assert.equal(row.normalizedKeyword, first.keyword);
              assert.equal(row.locale, "en");
              const retry = await post(first, { Cookie: cookieHeader });
              assert.equal(retry.status, 204);
              assert.equal(searchVisitorCookies(retry).length, 0);
              assert.equal(
                await prisma.searchEvent.count({
                  where: { eventId: first.eventId },
                }),
                1,
              );
              const continued = event(`${prefix} http stable identity`);
              assert.equal(
                (await post(continued, { Cookie: cookieHeader })).status,
                204,
              );
              assert.equal(
                (
                  await prisma.searchEvent.findUniqueOrThrow({
                    where: { eventId: continued.eventId },
                  })
                ).visitorId,
                row.visitorId,
              );
              const secondVisitor = await post(event());
              assert.equal(secondVisitor.status, 204);
              const tampered = await post(
                event(`${prefix} http replaced identity`),
                {
                  Cookie: `${SEARCH_VISITOR_COOKIE}=${cookieValue.slice(0, -1)}x`,
                },
              );
              assert.equal(tampered.status, 204);
              assert.ok(
                tampered.headers
                  .getSetCookie()
                  .some((cookie) =>
                    cookie.startsWith(`${SEARCH_VISITOR_COOKIE}=`),
                  ),
              );

              const popular = await fetch(`${origin}/api/searches?locale=en`);
              assert.equal(popular.status, 200);
              assert.match(
                popular.headers.get("cache-control") ?? "",
                /s-maxage=60/,
              );
              const data = (await popular.json()) as PopularSearches;
              assert.equal(data.windowDays, 7);
              assert.ok(Number.isFinite(Date.parse(data.updatedAt)));
              assert.deepEqual(
                data.items.find((item) => item.term === first.keyword),
                { term: first.keyword, count: 2 },
              );
              assert.equal(
                data.items.some((item) => item.term === continued.keyword),
                false,
              );
              assert.equal(
                (await fetch(`${origin}/api/searches?locale=de`)).status,
                400,
              );
              assert.equal((await fetch(`${origin}/api/searches`)).status, 400);
            },
            { DATABASE_URL: databaseUrl.toString() },
          );
        },
      );
    } finally {
      await prisma.searchEvent.deleteMany({
        where: { eventId: { in: [...eventIds] } },
      });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  },
);
