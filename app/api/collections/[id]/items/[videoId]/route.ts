import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { withRequestLog } from "@/lib/api-route";

export const DELETE = withRequestLog("api:collections.items.remove", async (_request, ctx) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { id, videoId } = (await ctx.params) as { id: string; videoId: string };
  const owned = await prisma.collection.findFirst({ where: { id, userId: session.user.id } });
  if (!owned) return NextResponse.json({ message: "Not found" }, { status: 404 });
  await prisma.collectionItem.deleteMany({ where: { collectionId: id, videoId } });
  return NextResponse.json({ ok: true });
});
