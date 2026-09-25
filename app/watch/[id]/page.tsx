import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { GradientMesh } from "@/components/site/gradient-mesh";
import { getVideoById, getRelatedVideos } from "@/lib/youtube";
import { WatchView } from "@/components/watch-view";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ loop?: string }> };

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  try {
    const v = await getVideoById(id);
    if (!v) return { title: "Không tìm thấy video - XemPhim" };
    return {
      title: `${v.title} - ${v.channel} | XemPhim`,
      description: v.description?.slice(0, 160) || "Xem video trên XemPhim",
      openGraph: {
        title: `${v.title} | XemPhim`,
        description: v.description?.slice(0, 160) || "Xem video trên XemPhim",
        images: v.thumbnail ? [{ url: v.thumbnail }] : [],
      },
    };
  } catch {
    return { title: "Xem video | XemPhim" };
  }
}

export default async function WatchPage({ params, searchParams }: Params) {
  const { id } = await params;
  const { loop } = await searchParams;
  const wantLoop = loop === "1" || loop === "true";

  let video: Awaited<ReturnType<typeof getVideoById>> = null;
  try {
    video = await getVideoById(id);
  } catch {
    /* fall through to notFound */
  }
  if (!video) notFound();

  let relatedVideos: Awaited<ReturnType<typeof getRelatedVideos>> = [];
  try {
    relatedVideos = await getRelatedVideos(video, 8);
  } catch {
    relatedVideos = [];
  }

  return (
    <div className="flex min-h-screen flex-col">
      <GradientMesh />
      <SiteHeader />
      <main className="container flex-1 py-6 sm:py-8">
        <WatchView video={video} relatedVideos={relatedVideos} loop={wantLoop} />
      </main>
      <SiteFooter />
    </div>
  );
}
