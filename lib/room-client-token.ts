import { createHmac, timingSafeEqual } from "node:crypto";
function secret() {
  const value = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is required for room membership proofs");
  return value;
}
export function roomClientToken(roomId: string, clientId: string, ownerKey: string) {
  return createHmac("sha256", secret()).update(JSON.stringify([roomId, clientId, ownerKey])).digest("hex");
}
export function verifyRoomClientToken(roomId: string, clientId: string, ownerKey: string, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  return timingSafeEqual(Buffer.from(roomClientToken(roomId, clientId, ownerKey), "hex"), Buffer.from(token, "hex"));
}
