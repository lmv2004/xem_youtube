import { cookies } from "next/headers";
import { prisma } from "./db";
export async function ownsRoomPresence(code: string, clientId: string) {
  const ownerKey = (await cookies()).get("xem_room_owner")?.value;
  if (!ownerKey) return false;
  const rows = await prisma.$queryRaw<{ ownerKey: string | null }[]>`SELECT p."ownerKey" FROM "RoomPresence" p JOIN "Room" r ON r.id = p."roomId" WHERE r.code = ${code} AND p."clientId" = ${clientId}`;
  return rows[0]?.ownerKey === ownerKey;
}
