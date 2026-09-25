import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { GradientMesh } from "@/components/site/gradient-mesh";
import { FavoritesLibrary } from "@/components/favorites-library";
import type { VideoItem } from "@/lib/types";

export const metadata = {
  title: "Yêu thích | XemPhim",
  description: "Quản lý danh sách video yêu thích và bộ sưu tập của bạn trên XemPhim.",
};

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/favorites");

  const rawCollections = await prisma.collection.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      items: {
        orderBy: { createdAt: "desc" },
        take: 4,
        select: { thumbnail: true },
      },
      _count: { select: { items: true } },
    },
  });

  const allItems = await prisma.collectionItem.findMany({
    where: {
      collection: { userId: session.user.id },
    },
    orderBy: { createdAt: "desc" },
  });

  // Extract unique saved video items
  const uniqueVideosMap = new Map<string, VideoItem>();
  for (const it of allItems) {
    if (!uniqueVideosMap.has(it.videoId)) {
      uniqueVideosMap.set(it.videoId, {
        id: it.videoId,
        title: it.title,
        channel: it.channel,
        thumbnail: it.thumbnail,
        durationSeconds: it.duration,
        viewCount: it.viewCount,
        embedUrl: it.embedUrl,
        watchUrl: it.watchUrl,
        publishedAt: it.publishedAt ?? "",
        description: it.description ?? "",
        embeddable: true,
      });
    }
  }

  const collections = rawCollections.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    itemCount: c._count.items,
    updatedAt: c.updatedAt.toISOString(),
    thumbnails: c.items.map((it) => it.thumbnail).filter(Boolean),
  }));

  const savedVideos = Array.from(uniqueVideosMap.values());

  return (
    <div className="flex min-h-screen flex-col">
      <GradientMesh />
      <SiteHeader />
      <main className="container flex-1 py-8">
        <Suspense fallback={<div className="text-center py-10 text-muted-foreground">Đang tải thư viện...</div>}>
          <FavoritesLibrary collections={collections} savedVideos={savedVideos} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
