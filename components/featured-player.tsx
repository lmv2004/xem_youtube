"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { VideoItem } from "@/lib/types";
import { formatDuration, formatViews } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookmarkPlus, ExternalLink, Play, X } from "lucide-react";
import { AddToCollectionDialog } from "./add-to-collection-dialog";
import { useRouter } from "next/navigation";

export function FeaturedPlayer({ item }: { item: VideoItem }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [played, setPlayed] = useState(false);

  // Record view history only after the user actually starts playback AND the
  // video is embeddable on this origin. For embeddable=false we never reach
  // this state (the FeaturedPlayer shows the "Mở YouTube" fallback).
  useEffect(() => {
    if (!played || !session || item.embeddable === false) return;
    fetch("/api/history", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ item }),
    }).catch(() => {
      /* ignore */
    });
  }, [played, session, item]);

  const blocked = item.embeddable === false;

  return (
    <Card>
      <CardContent className="space-y-3 p-0">
        <div className="relative overflow-hidden rounded-t-lg bg-black">
          <div className="aspect-video w-full">
            {blocked ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-foreground/90 p-4 text-center text-background">
                <p className="font-medium">Video chặn nhúng trên trang này.</p>
                <p className="text-xs opacity-80">
                  Chủ kênh đã tắt nhúng ở một số website. Bạn có thể mở trực tiếp trên YouTube.
                </p>
                <Button asChild size="sm" variant="secondary">
                  <a href={item.watchUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1" /> Mở trên YouTube
                  </a>
                </Button>
              </div>
            ) : played ? (
              <iframe
                src={`${item.embedUrl}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                title={item.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full"
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlayed(true)}
                className="group relative block h-full w-full"
                aria-label={`Phát ${item.title}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`}
                  alt=""
                  className="h-full w-full object-cover opacity-90 transition group-hover:opacity-75"
                />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-primary/90 p-4 text-primary-foreground shadow-lg">
                    <Play className="h-6 w-6" />
                  </span>
                </span>
              </button>
            )}
          </div>
        </div>
        <div className="space-y-2 p-4">
          <h2 className="text-lg font-semibold leading-snug sm:text-xl">{item.title}</h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{item.channel}</span>
            {" · "}
            {formatViews(item.viewCount)}
            {item.durationSeconds > 0 ? ` · ${formatDuration(item.durationSeconds)}` : ""}
          </p>
          {item.description ? (
            <p className="line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            {blocked ? null : played ? (
              <Button variant="outline" size="sm" onClick={() => setPlayed(false)}>
                <X className="mr-1" /> Dừng phát
              </Button>
            ) : (
              <Button size="sm" onClick={() => setPlayed(true)}>
                <Play className="mr-1" /> Phát ngay
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <BookmarkPlus className="mr-1" /> Lưu vào danh sách
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={item.watchUrl} target="_blank" rel="noopener noreferrer">
                Mở YouTube
              </Link>
            </Button>
            {!session ? (
              <Button variant="ghost" size="sm" onClick={() => router.push("/login?callbackUrl=/")}>
                Đăng nhập để lưu lịch sử
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
      <AddToCollectionDialog open={addOpen} onOpenChange={setAddOpen} item={item} />
    </Card>
  );
}
