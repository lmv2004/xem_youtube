import { SiteShell } from "@/components/site/site-shell";
import { getTranslator } from "@/lib/locale-server";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Glass } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { CollectionManager } from "@/components/collection-manager";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("Chi tiết bộ sưu tập") };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslator();
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/favorites");
  const { id } = await params;
  const collection = await prisma.collection.findFirst({
    where: { id, userId: session.user.id },
    include: { items: { orderBy: { createdAt: "desc" } } },
  });
  if (!collection) notFound();

  return (
    <SiteShell>
      <Glass
        intensity="strong"
        className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between glow-soft animate-in-up"
      >
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {collection.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {collection.items.length} {t("video đã lưu.")}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/favorites">{t("← Quay lại")}</Link>
        </Button>
      </Glass>

      <CollectionManager
        ownerId={session.user.id}
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
    </SiteShell>
  );
}
