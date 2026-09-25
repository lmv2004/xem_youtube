import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { History as HistoryIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { GradientMesh } from "@/components/site/gradient-mesh";
import { HistoryList } from "@/components/history-list";

export const metadata = {
  title: "Lịch sử xem | XemPhim",
  description: "Xem lại danh sách và thời gian các video đã xem trên XemPhim.",
};

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/history");

  const items = await prisma.viewHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const formattedItems = items.map((it) => ({
    historyId: it.id,
    id: it.videoId,
    title: it.title,
    channel: it.channel,
    thumbnail: it.thumbnail,
    durationSeconds: it.duration,
    viewCount: it.viewCount,
    embedUrl: it.embedUrl,
    watchUrl: it.watchUrl,
    publishedAt: (it as { publishedAt?: string | null }).publishedAt ?? "",
    description: (it as { description?: string | null }).description ?? "",
    embeddable: true,
    watchedAt: it.createdAt.toISOString(),
    topic: it.topic ?? "",
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <GradientMesh />
      <SiteHeader />
      <main className="container max-w-4xl flex-1 space-y-6 py-8">
        <div className="animate-in-up">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight inline-flex items-center gap-3">
            <span className="rounded-2xl bg-primary/15 p-2.5 ring-1 ring-primary/30 text-primary">
              <HistoryIcon className="h-6 w-6" />
            </span>
            Lịch sử xem
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Theo dõi các video bạn đã mở và thời gian xem gần đây.
          </p>
        </div>

        <HistoryList initialItems={formattedItems} />
      </main>
      <SiteFooter />
    </div>
  );
}
