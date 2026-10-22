import { PrismaClient } from "@prisma/client";

// Additive, idempotent schema upgrade. Never reset or db push production data.
const db = new PrismaClient();
try {
  await db.$transaction(
    async (tx) => {
      // Preview and production builds can share a database. Serialize this
      // feature's additive upgrade, including PostgreSQL's initial table creation.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('xemphim:search-analytics:schema:v1', 0))`;
      await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SearchEvent" (
    "eventId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "normalizedKeyword" TEXT NOT NULL,
    "displayKeyword" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchEvent_pkey" PRIMARY KEY ("eventId")
  )`);
      for (const statement of [
        `CREATE UNIQUE INDEX IF NOT EXISTS "SearchEvent_dedupeKey_key" ON "SearchEvent"("dedupeKey")`,
        `CREATE INDEX IF NOT EXISTS "SearchEvent_locale_createdAt_idx" ON "SearchEvent"("locale", "createdAt")`,
        `CREATE INDEX IF NOT EXISTS "SearchEvent_visitorId_createdAt_idx" ON "SearchEvent"("visitorId", "createdAt")`,
        `CREATE INDEX IF NOT EXISTS "SearchEvent_createdAt_idx" ON "SearchEvent"("createdAt")`,
      ])
        await tx.$executeRawUnsafe(statement);
    },
    { maxWait: 10000, timeout: 60000 },
  );
  console.log("Search analytics schema is ready.");
} finally {
  await db.$disconnect();
}
