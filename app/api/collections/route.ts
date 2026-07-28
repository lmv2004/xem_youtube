import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { log } from "@/lib/logger";
import { withRequestLog } from "@/lib/api-route";

const createSchema = z.object({
  name: z.string().min(1, "Tên danh sách không được trống.").max(80),
});

export const GET = withRequestLog("api:collections.list", async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const rows = await prisma.collection.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return NextResponse.json({
    items: rows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      itemCount: c._count.items,
      createdAt: c.createdAt,
    })),
  });
});

export const POST = withRequestLog("api:collections.create", async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    log.warn("api:collections.create", "zod validation failed", {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      { status: 400 },
    );
  }
  const name = parsed.data.name.trim();
  const slug = slugify(name);
  try {
    const created = await prisma.collection.create({
      data: { userId: session.user.id, name, slug },
    });
    log.info("api:collections.create", "collection created", {
      userId: session.user.id,
      collectionId: created.id,
      slug: created.slug,
    });
    return NextResponse.json(
      { item: { id: created.id, name: created.name, slug: created.slug } },
      { status: 201 },
    );
  } catch (err: unknown) {
    log.error("api:collections.create", "prisma create failed", {
      userId: session.user.id,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ message: "Không thể tạo danh sách." }, { status: 500 });
  }
});
