"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { VideoItem } from "@/lib/types";
import { formatDuration, formatViews } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookmarkPlus,
  ChevronsDownUp,
  ChevronsUpDown,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Users,
  X,
} from "lucide-react";
import { AddToCollectionDialog } from "./add-to-collection-dialog";
import { useCreateRoom } from "@/hooks/use-create-room";
import { useRouter } from "next/navigation";

export type FeaturedPlayerHandle = {
  scrollIntoView: () => void;
};

type Props = {
  item: VideoItem;
  onMinimizeToggle?: () => void;
  minimized?: boolean;
};

export const FeaturedPlayer = forwardRef<FeaturedPlayerHandle, Props>(function FeaturedPlayer(
  { item, onMinimizeToggle, minimized = false },
  ref,
) {
  const { data: session } = useSession();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { createRoom, isCreating } = useCreateRoom();

  useImperativeHandle(ref, () => ({
    scrollIntoView: () => {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  }));

  // Record view history only when the user actually starts playback AND the
  // video is embeddable on this origin.
  useEffect(() => {
    if (!playing || !session || item.embeddable === false) return;
    fetch("/api/history", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ item }),
    }).catch(() => {
      /* ignore */
    });
  }, [playing, session, item]);

  // ESC to close player when it's playing.
  useEffect(() => {
    if (!playing) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPlaying(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  const blocked = item.embeddable === false;

  return (
    <Card ref={rootRef} className="glass glow-soft animate-in-up overflow-hidden">
      <CardContent className="space-y-3 p-0">
        <div className="relative overflow-hidden rounded-t-lg bg-black">
          <div className="aspect-video w-full">
            {blocked ? (
              <BlockedEmbed item={item} />
            ) : playing && !minimized ? (
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
                onClick={() => setPlaying(true)}
                className="group relative block h-full w-full"
                aria-label={`Phát ${item.title}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnail || "https://i.ytimg.com/vi/" + item.id + "/hqdefault.jpg"}
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
          {playing && !minimized ? (
            <button
              type="button"
              onClick={() => setPlaying(false)}
              aria-label="Đóng trình phát (Esc)"
              className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white shadow-lg transition hover:bg-black/90"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="space-y-2 p-4">
          <h2 className="font-display text-xl font-semibold leading-snug sm:text-2xl">
            {item.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{item.channel}</span>
            {" · "}
            {formatViews(item.viewCount)}
            {item.durationSeconds > 0 ? ` · ${formatDuration(item.durationSeconds)}` : ""}
          </p>
          {item.description ? (
            <div className="space-y-1">
              <p
                className={
                  expanded ? "text-sm text-muted-foreground whitespace-pre-wrap" : "line-clamp-3 text-sm text-muted-foreground"
                }
              >
                {item.description}
              </p>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {expanded ? (
                  <>
                    <ChevronsDownUp className="h-3 w-3" /> Thu gọn
                  </>
                ) : (
                  <>
                    <ChevronsUpDown className="h-3 w-3" /> Xem thêm
                  </>
                )}
              </button>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            {blocked ? null : playing ? (
              <Button variant="outline" size="sm" onClick={() => setPlaying(false)}>
                <Pause className="mr-1" /> Dừng phát
              </Button>
            ) : (
              <Button size="sm" onClick={() => setPlaying(true)}>
                <Play className="mr-1" /> Phát ngay
              </Button>
            )}
            {/* A room plays through the IFrame API, so a video that blocks
                embedding would only produce a dead room. */}
            {blocked ? null : (
              <Button
                variant="outline"
                size="sm"
                disabled={isCreating}
                onClick={() => void createRoom(item)}
              >
                {isCreating ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Users className="mr-1 h-4 w-4" />
                )}
                Xem cùng nhau
              </Button>
            )}
            {onMinimizeToggle ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onMinimizeToggle}
                aria-label={minimized ? "Phóng to trình phát" : "Thu nhỏ trình phát"}
              >
                {minimized ? (
                  <>
                    <Maximize2 className="mr-1" /> Phóng to
                  </>
                ) : (
                  <>
                    <Minimize2 className="mr-1" /> Mini-player
                  </>
                )}
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <BookmarkPlus className="mr-1" /> Lưu vào danh sách
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={item.watchUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1" /> Mở YouTube
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
});

function BlockedEmbed({ item }: { item: VideoItem }) {
  return (
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
  );
}
