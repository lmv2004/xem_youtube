import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { GradientMesh } from "@/components/site/gradient-mesh";
import { getVideoById, getRelatedVideos } from "@/lib/youtube";
import { MobileNav } from "@/components/site/mobile-nav";
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
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) notFound();
  const wantLoop = loop === "1" || loop === "true";

  let video: Awaited<ReturnType<typeof getVideoById>> = null;
  let metadataUnavailable = false;
  try {
    video = await getVideoById(id);
  } catch {
    // Embedding does not require a Data API key. Keep playback available when
    // metadata is unavailable (quota, missing key, or a temporary API outage).
    metadataUnavailable = true;
    video = {
      id,
      title: "Video YouTube",
      description: "",
      channel: "YouTube",
      publishedAt: "",
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      durationSeconds: 0,
      viewCount: 0,
    };
  }
  if (!video) notFound();

  let relatedVideos: Awaited<ReturnType<typeof getRelatedVideos>> = [];
  try {
    if (!metadataUnavailable) relatedVideos = await getRelatedVideos(video, 8);
  } catch {
    relatedVideos = [];
  }

  return (
    <div className="flex min-h-screen flex-col pb-20 lg:pb-0">
      <GradientMesh />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="container flex-1 py-6 sm:py-8">
        {metadataUnavailable && (
          <p role="status" className="mx-auto mb-4 max-w-6xl rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            Chưa tải được thông tin video. Bạn vẫn có thể thử phát bên dưới hoặc mở trên YouTube.
          </p>
        )}
        <WatchView video={video} relatedVideos={relatedVideos} loop={wantLoop} />
      </main>
      <SiteFooter />
      <MobileNav />
    </div>
  );
}
