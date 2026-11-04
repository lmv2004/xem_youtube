import { prisma } from "./db";
import { defaultStageState, withStageState, type RoomStageState } from "./room-stage";

export async function readStage(code: string): Promise<RoomStageState | null> {
  const rows = await prisma.$queryRaw<{ stage: RoomStageState }[]>`SELECT stage FROM "Room" WHERE code = ${code}`;
  return rows.length ? { ...defaultStageState(), ...rows[0].stage } : null;
}

/** Room row lock serializes stage edits across Vercel instances without moving playback timestamps. */
export async function mutateStage(code: string, run: () => Response): Promise<Response> {
  return prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<{ stage: RoomStageState }[]>`SELECT stage FROM "Room" WHERE code = ${code} FOR UPDATE`;
    if (!rows.length) return Response.json({ message: "Phòng đã đóng." }, { status: 404 });
    const state = { ...defaultStageState(), ...rows[0].stage };
    const previous = state.lastUpdatedAt;
    const response = withStageState(state, run);
    if (!response.ok) return response;
    state.lastUpdatedAt = Math.max(Date.now(), previous + 1);
    await tx.$executeRaw`UPDATE "Room" SET stage = ${JSON.stringify(state)}::jsonb WHERE code = ${code}`;
    return Response.json(state);
  });
}
