import { prisma } from "./db";
import type { Locale } from "./locale";
import {
  analyticsRetentionStart,
  analyticsWindowStart,
  eventDeduplicationKey,
  normalizeAnalyticsKeyword,
  parseSearchEvent,
  SEARCH_HOURLY_LIMIT,
  type PopularSearches,
  type SearchEventInput,
} from "./search-analytics";

type RecordResult = {
  recorded: boolean;
  reason: "recorded" | "duplicate" | "rate-limited" | "ignored";
};
let nextCleanupAt = 0;

/** Best-effort, bounded retention. Only this feature's expired anonymous rows are touched. */
async function cleanExpiredEvents(now: Date): Promise<void> {
  if (now.getTime() < nextCleanupAt) return;
  nextCleanupAt = now.getTime() + 60 * 60 * 1000;
  try {
    // Prisma DateTime columns use UTC timestamp(3) without timezone. Bind UTC
    // text explicitly, so a non-UTC PostgreSQL session cannot shift the cutoff.
    await prisma.$executeRaw`DELETE FROM "SearchEvent" WHERE "eventId" IN (
      SELECT "eventId" FROM "SearchEvent" WHERE "createdAt" < ${analyticsRetentionStart(now).toISOString()}::timestamp(3)
      ORDER BY "createdAt" ASC LIMIT 1000
    )`;
  } catch {
    // Retention never makes recording or searching fail; try again on a later write.
    nextCleanupAt = now.getTime() + 5 * 60 * 1000;
  }
}

export async function recordSearchEvent(
  input: SearchEventInput,
  visitorId: string,
  options: { now?: Date } = {},
): Promise<RecordResult> {
  const parsed = parseSearchEvent(input);
  const keyword = parsed ? normalizeAnalyticsKeyword(parsed.keyword) : null;
  if (!parsed || !keyword || !/^[a-f0-9]{64}$/.test(visitorId)) {
    return { recorded: false, reason: "ignored" };
  }
  const now = options.now ?? new Date();
  const dedupeKey = eventDeduplicationKey(
    visitorId,
    keyword.normalized,
    parsed.locale,
    now,
  );
  const result = await prisma.$transaction(
    async (tx): Promise<RecordResult> => {
      // Serialize this visitor's count + insert, including requests from multiple tabs.
      // No account, history, or room rows are locked or queried.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${visitorId}, 0))`;
      const existing = await tx.searchEvent.findFirst({
        where: { OR: [{ eventId: parsed.eventId }, { dedupeKey }] },
        select: { eventId: true },
      });
      if (existing) return { recorded: false, reason: "duplicate" };
      const recentCount = await tx.searchEvent.count({
        where: {
          visitorId,
          createdAt: {
            gte: new Date(now.getTime() - 60 * 60 * 1000),
            lte: now,
          },
        },
      });
      if (recentCount >= SEARCH_HOURLY_LIMIT)
        return { recorded: false, reason: "rate-limited" };
      const created = await tx.searchEvent.createMany({
        data: [
          {
            eventId: parsed.eventId,
            dedupeKey,
            visitorId,
            normalizedKeyword: keyword.normalized,
            displayKeyword: keyword.display,
            locale: parsed.locale,
            createdAt: now,
          },
        ],
        skipDuplicates: true,
      });
      return created.count
        ? { recorded: true, reason: "recorded" }
        : { recorded: false, reason: "duplicate" };
    },
    { maxWait: 3000, timeout: 5000 },
  );
  await cleanExpiredEvents(now);
  return result;
}

/** Exact trailing seven days, public only after two distinct anonymous visitors. */
export async function readPopularSearches(
  locale: Locale,
  now = new Date(),
): Promise<PopularSearches> {
  const rows = await prisma.$queryRaw<{ term: string; count: bigint }[]>`
    WITH eligible AS (
      SELECT "normalizedKeyword", "displayKeyword", "visitorId"
      FROM "SearchEvent"
      WHERE "locale" = ${locale}
        AND "createdAt" >= ${analyticsWindowStart(now).toISOString()}::timestamp(3)
        AND "createdAt" <= ${now.toISOString()}::timestamp(3)
    ), totals AS (
      SELECT "normalizedKeyword", COUNT(*) AS count FROM eligible
      GROUP BY "normalizedKeyword" HAVING COUNT(DISTINCT "visitorId") >= 2
    ), spellings AS (
      SELECT "normalizedKeyword", "displayKeyword",
        ROW_NUMBER() OVER (PARTITION BY "normalizedKeyword"
          ORDER BY COUNT(*) DESC, "displayKeyword" COLLATE "C" ASC) AS rank
      FROM eligible GROUP BY "normalizedKeyword", "displayKeyword"
    )
    SELECT spellings."displayKeyword" AS term, totals.count FROM totals
    JOIN spellings ON spellings."normalizedKeyword" = totals."normalizedKeyword" AND spellings.rank = 1
    ORDER BY totals.count DESC, totals."normalizedKeyword" COLLATE "C" ASC
    LIMIT 10
  `;
  return {
    items: rows.map((row) => ({ term: row.term, count: Number(row.count) })),
    windowDays: 7,
    updatedAt: now.toISOString(),
  };
}
