import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { GradientMesh } from "@/components/site/gradient-mesh";
import { AccountDashboard } from "@/components/account-dashboard";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Tài khoản & Cài đặt | XemPhim",
  description: "Quản lý thông tin tài khoản, sở thích đề xuất và cài đặt giao diện trên XemPhim.",
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/account");

  const [totalWatched, totalSeconds, topChannels, recentDate] = await Promise.all([
    prisma.viewHistory.count({ where: { userId: session.user.id } }),
    prisma.viewHistory.aggregate({
      where: { userId: session.user.id },
      _sum: { duration: true },
    }),
    prisma.viewHistory.groupBy({
      by: ["channel"],
      where: { userId: session.user.id },
      _count: { channel: true },
      orderBy: { _count: { channel: "desc" } },
      take: 5,
    }),
    prisma.viewHistory.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, title: true },
    }),
  ]);

  const minutes = Math.round((totalSeconds._sum.duration ?? 0) / 60);
  const lastSeenDate = recentDate
    ? new Date(recentDate.createdAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const stats = {
    totalWatched,
    totalMinutes: minutes,
    lastSeenDate,
    lastSeenTitle: recentDate?.title ?? null,
    topChannels: topChannels.map((c) => ({
      channel: c.channel,
      count: c._count.channel,
    })),
  };

  const userInfo = {
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
  };

  return (
    <div className="flex min-h-screen flex-col">
      <GradientMesh />
      <SiteHeader />
      <main className="container max-w-4xl flex-1 py-10">
        <Suspense fallback={<div className="text-center py-10 text-muted-foreground">Đang tải tài khoản...</div>}>
          <AccountDashboard user={userInfo} stats={stats} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
