import Link from "next/link";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { GradientMesh } from "@/components/site/gradient-mesh";
import { Glass } from "@/components/ui/glass";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CollectionManager } from "@/components/collection-manager";

export const metadata = { title: "Chi tiết danh sách - XemPhimYouTube" };

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/favorites");
  const { id } = await params;
  const collection = await prisma.collection.findFirst({
    where: { id, userId: session.user.id },
    include: { items: { orderBy: { createdAt: "desc" } } },
  });
  if (!collection) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <GradientMesh />
      <SiteHeader />
      <main className="container flex-1 space-y-6 py-8">
        <Glass intensity="strong" className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between glow-soft animate-in-up">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{collection.name}</h1>
            <p className="text-sm text-muted-foreground">{collection.items.length} video đã lưu.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/favorites">← Quay lại</Link>
          </Button>
        </Glass>

        <CollectionManager
          collectionId={collection.id}
          collectionName={collection.name}
          items={collection.items.map((it) => ({
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
          }))}
        />

        {collection.items.length === 0 ? (
          <Card className="glass">
            <CardHeader>
              <CardTitle>Chưa có video nào</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Quay lại trang chủ, chọn một video và bấm <strong>Lưu</strong> để thêm vào danh sách.
            </CardContent>
          </Card>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
