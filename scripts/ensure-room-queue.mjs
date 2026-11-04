import { PrismaClient } from "@prisma/client";

// Additive, idempotent upgrade for existing installations without migration history.
// Never use db push / reset against production as part of a build.
const db = new PrismaClient();
try {
  await db.$executeRawUnsafe(`ALTER TABLE "Room"
    ADD COLUMN IF NOT EXISTS "stage" JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS "queue" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS "playbackGeneration" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "allowQueueAdds" BOOLEAN NOT NULL DEFAULT false`);
  await db.$executeRawUnsafe(`ALTER TABLE "RoomPresence" ADD COLUMN IF NOT EXISTS "ownerKey" TEXT`);
  console.log("Room queue schema is ready.");
} finally {
  await db.$disconnect();
}
