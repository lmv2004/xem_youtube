import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Heart, Plus, FolderOpen } from "lucide-react";
import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { GradientMesh } from "@/components/site/gradient-mesh";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Glass } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { NewCollectionForm } from "@/components/new-collection-form";

export const metadata = { title: "Danh sách yêu thích - XemPhimYouTube" };

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/favorites");

  const collections = await prisma.collection.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <GradientMesh />
      <SiteHeader />
      <main className="container flex-1 space-y-8 py-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between animate-in-up">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Danh sách yêu thích
            </h1>
            <p className="text-sm text-muted-foreground">
              Quản lý các danh sách video đã lưu. Bạn có thể tạo bao nhiêu tuỳ thích.
            </p>
          </div>
        </div>

        <Glass intensity="strong" className="p-5 sm:p-6 glow-soft animate-in-up">
          <div className="mb-4">
            <h2 className="font-display text-lg font-semibold">Tạo danh sách mới</h2>
            <p className="text-sm text-muted-foreground">Đặt tên ngắn gọn để dễ nhận biết.</p>
          </div>
          <NewCollectionForm />
        </Glass>

        {collections.length === 0 ? (
          <Glass intensity="soft" className="p-10 text-center text-sm text-muted-foreground animate-in-up">
            <FolderOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            Bạn chưa có danh sách nào. Tạo danh sách đầu tiên ở trên rồi quay lại trang chủ để
            lưu video.
          </Glass>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c, idx) => (
              <li
                key={c.id}
                className="animate-in-up"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <Card className="h-full glass glow-soft transition hover:-translate-y-1 hover:glow-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/15 p-2 ring-1 ring-primary/30">
                        <Heart className="h-4 w-4 text-primary" />
                      </span>
                      {c.name}
                    </CardTitle>
                    <CardDescription>{c._count.items} video</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <Link href={`/favorites/${c.id}`}>
                        <Plus className="mr-1" /> Mở danh sách
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
