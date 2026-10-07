import { PrismaClient } from "@prisma/client";

// Additive, idempotent upgrade for existing installations without migration history.
// Never use db push / reset against production as part of a build.
const db = new PrismaClient();
try {
  await db.$executeRawUnsafe(`ALTER TABLE "Room"
    ADD COLUMN IF NOT EXISTS "queue" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS "playbackGeneration" INTEGER NOT NULL DEFAULT 0`);
  console.log("Room queue schema is ready.");
} finally {
  await db.$disconnect();
}
