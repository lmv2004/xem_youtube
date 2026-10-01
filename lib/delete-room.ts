type RoomStore = {
  findUnique(args: { where: { code: string } }): Promise<{ hostId: string } | null>;
  deleteMany(args: { where: { code: string; hostId: string } }): Promise<{ count: number }>;
};

/** Ownership comes exclusively from the authenticated session, never a client ID. */
export async function deleteOwnedRoom(store: RoomStore, code: string, userId?: string) {
  if (!userId) return { status: 401, message: "Bạn cần đăng nhập để xóa phòng." };
  const room = await store.findUnique({ where: { code } });
  if (!room) return { status: 404, message: "Phòng đã đóng hoặc không tồn tại." };
  if (room.hostId !== userId) return { status: 403, message: "Chỉ chủ phòng được xóa phòng." };
  // Repeat ownership in the atomic delete. Related messages/presences cascade.
  await store.deleteMany({ where: { code, hostId: userId } });
  return { status: 200, message: "Đã xóa phòng." };
}
