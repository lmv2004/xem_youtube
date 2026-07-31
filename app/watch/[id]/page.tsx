import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { GradientMesh } from "@/components/site/gradient-mesh";
import { VideoEmbed } from "@/components/video-embed";
import { Button } from "@/components/ui/button";
import { formatDuration, formatViews } from "@/lib/format";
import { getVideoById } from "@/lib/youtube";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  try {
    const v = await getVideoById(id);
    if (!v) return { title: "Không tìm thấy video - XemPhimYouTube" };
    return { title: `${v.title} - ${v.channel} - XemPhimYouTube` };
  } catch {
    return { title: "Đang tải... - XemPhimYouTube" };
  }
}

export default async function WatchPage({ params }: Params) {
  const { id } = await params;
  let video: Awaited<ReturnType<typeof getVideoById>> = null;
  try {
    video = await getVideoById(id);
  } catch {
    /* fall through to notFound */
  }
  if (!video) notFound();

  const published = video.publishedAt
    ? new Date(video.publishedAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <GradientMesh />
      <SiteHeader />
      <main className="container flex-1 py-8">
        <article className="mx-auto max-w-4xl space-y-6">
          <VideoEmbed item={video} className="rounded-2xl ring-1 ring-ink/10" autoPlay />

          <header className="space-y-2">
            <h1 className="font-display text-2xl leading-tight sm:text-3xl">
              {video.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-ink">{video.channel}</span>
              {video.viewCount > 0 ? ` · ${formatViews(video.viewCount)}` : ""}
              {video.durationSeconds > 0 ? ` · ${formatDuration(video.durationSeconds)}` : ""}
              {published ? ` · ${published}` : ""}
            </p>
          </header>

          {video.description ? (
            <section className="space-y-2 rounded-2xl border border-ink/10 bg-panel/60 p-4 text-sm leading-relaxed text-ink/90">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Mô tả
              </h2>
              <p className="whitespace-pre-wrap break-words">{video.description}</p>
            </section>
          ) : null}

          {video.embeddable === false ? (
            <section className="space-y-3 rounded-2xl border border-amber-300/40 bg-amber-50/60 p-4 text-sm text-amber-900">
              <p className="font-medium">Video chặn nhúng trên trang này.</p>
              <p className="text-xs opacity-80">
                Chủ kênh đã tắt nhúng ở một số website. Bạn có thể mở trực tiếp trên YouTube.
              </p>
              <Button asChild size="sm" variant="secondary">
                <a href={video.watchUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1" /> Mở trên YouTube
                </a>
              </Button>
            </section>
          ) : null}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4 text-sm">
            <Button asChild variant="outline" size="sm">
              <Link href="/watch">Xem video khác</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href={video.watchUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1" /> Mở trên YouTube
              </a>
            </Button>
          </footer>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
