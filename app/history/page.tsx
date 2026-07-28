import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { HistoryList } from "@/components/history-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Lịch sử xem - XemPhimYouTube" };

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/history");

  const items = await prisma.viewHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container flex-1 space-y-6 py-8">
        <h1 className="text-2xl font-bold">Lịch sử xem</h1>
        {items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Chưa có lượt xem nào</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Các video bạn phát sẽ xuất hiện ở đây.
            </CardContent>
          </Card>
        ) : (
          <HistoryList
            items={items.map((it) => ({
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
              watchedAt: it.createdAt.toISOString(),
              topic: it.topic ?? "",
            }))}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
