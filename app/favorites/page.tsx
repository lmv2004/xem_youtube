import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <SiteHeader />
      <main className="container flex-1 space-y-6 py-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Danh sách yêu thích</h1>
            <p className="text-sm text-muted-foreground">
              Quản lý các danh sách video đã lưu. Bạn có thể tạo bao nhiêu tuỳ thích.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tạo danh sách mới</CardTitle>
            <CardDescription>Đặt tên ngắn gọn để dễ nhận biết.</CardDescription>
          </CardHeader>
          <CardContent>
            <NewCollectionForm />
          </CardContent>
        </Card>

        {collections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Bạn chưa có danh sách nào. Tạo danh sách đầu tiên ở trên rồi quay lại trang chủ để
            lưu video.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => (
              <li key={c.id}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-primary" /> {c.name}
                    </CardTitle>
                    <CardDescription>
                      {c._count.items} video
                    </CardDescription>
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
