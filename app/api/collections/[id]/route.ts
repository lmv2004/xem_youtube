import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { withRequestLog } from "@/lib/api-route";

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
});

export const PATCH = withRequestLog("api:collections.patch", async (request, ctx) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { id } = (await ctx.params) as { id: string };
  const owned = await prisma.collection.findFirst({ where: { id, userId: session.user.id } });
  if (!owned) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  const data: { name?: string } = {};
  if (parsed.data.name) data.name = parsed.data.name.trim();
  const updated = await prisma.collection.update({ where: { id }, data });
  return NextResponse.json({ item: { id: updated.id, name: updated.name, slug: updated.slug } });
});

export const DELETE = withRequestLog("api:collections.delete", async (_request, ctx) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { id } = (await ctx.params) as { id: string };
  const owned = await prisma.collection.findFirst({ where: { id, userId: session.user.id } });
  if (!owned) return NextResponse.json({ message: "Not found" }, { status: 404 });
  await prisma.collection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
