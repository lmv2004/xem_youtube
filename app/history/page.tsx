import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { History as HistoryIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { GradientMesh } from "@/components/site/gradient-mesh";
import { Glass } from "@/components/ui/glass";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HistoryList } from "@/components/history-list";

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
      <GradientMesh />
      <SiteHeader />
      <main className="container flex-1 space-y-6 py-8">
        <div className="animate-in-up">
          <h1 className="font-display text-3xl font-semibold tracking-tight inline-flex items-center gap-3">
            <span className="rounded-full bg-primary/15 p-2 ring-1 ring-primary/30">
              <HistoryIcon className="h-5 w-5 text-primary" />
            </span>
            Lịch sử xem
          </h1>
        </div>
        {items.length === 0 ? (
          <Card className="glass">
            <CardHeader>
              <CardTitle>Chưa có lượt xem nào</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Các video bạn phát sẽ xuất hiện ở đây.
            </CardContent>
          </Card>
        ) : (
          <Glass intensity="soft" className="p-3 sm:p-4 animate-in-up">
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
                publishedAt: (it as { publishedAt?: string | null }).publishedAt ?? "",
                description: (it as { description?: string | null }).description ?? "",
                embeddable: true,
                watchedAt: it.createdAt.toISOString(),
                topic: it.topic ?? "",
              }))}
            />
          </Glass>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
