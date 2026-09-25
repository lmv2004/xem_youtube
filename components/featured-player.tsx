"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookmarkPlus,
  Check,
  ChevronsDownUp,
  ChevronsUpDown,
  ExternalLink,
  Flame,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Repeat,
  Sparkles,
  Tv,
  Users,
  X,
} from "lucide-react";
import confetti from "canvas-confetti";
import type { VideoItem } from "@/lib/types";
import { formatDuration, formatViews } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { AddToCollectionDialog } from "./add-to-collection-dialog";
import { useCreateRoom } from "@/hooks/use-create-room";
import { cn } from "@/lib/utils";

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
  const [loop, setLoop] = useState(false);
  const { createRoom, isCreating } = useCreateRoom();

  useImperativeHandle(ref, () => ({
    scrollIntoView: () => {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  }));

  // Record view history only when playback begins
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

  // ESC to close player
  useEffect(() => {
    if (!playing) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPlaying(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  const blocked = item.embeddable === false;

  const iframeSrc = loop
    ? `${item.embedUrl}?autoplay=1&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${encodeURIComponent(item.id)}`
    : `${item.embedUrl}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

  const handleSaveCollection = () => {
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.6 },
      colors: ["#FF2A54", "#8B5CF6", "#06B6D4"],
    });
    setAddOpen(true);
  };

  return (
    <div ref={rootRef} className="relative group/featured rounded-3xl animate-in-up">
      {/* Dynamic Ambilight Glow Behind Billboard */}
      <div
        className="pointer-events-none absolute -inset-3 -z-10 rounded-[36px] bg-gradient-to-r from-rose-600/30 via-purple-600/25 to-cyan-500/25 opacity-70 blur-2xl transition-opacity duration-500 group-hover/featured:opacity-90"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/80 backdrop-blur-2xl shadow-2xl">
        {/* Top Video Stage */}
        <div className="relative overflow-hidden bg-black/95">
          <div className="aspect-video w-full">
            {blocked ? (
              <BlockedEmbed item={item} />
            ) : playing && !minimized ? (
              <iframe
                src={iframeSrc}
                title={item.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full"
              />
            ) : (
              <div
                onClick={() => setPlaying(true)}
                className="group relative h-full w-full cursor-pointer overflow-hidden"
                role="button"
                tabIndex={0}
                aria-label={`Phát video ${item.title}`}
                onKeyDown={(e) => e.key === "Enter" && setPlaying(true)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnail || `https://i.ytimg.com/vi/${item.id}/maxresdefault.jpg`}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-85"
                />

                {/* Cinematic Vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-black/40" />

                {/* Top Badges */}
                <div className="absolute left-4 top-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-black/70 px-3 py-1 text-xs font-bold text-rose-400 backdrop-blur-md shadow-lg">
                    <Flame className="h-3.5 w-3.5 fill-rose-500 text-rose-500 animate-pulse" />
                    TIÊU ĐIỂM THỊNH HÀNH
                  </span>
                  <span className="rounded-full border border-white/20 bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                    4K ULTRA HD
                  </span>
                </div>

                {/* Big Center Play Button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative flex items-center justify-center">
                    <span className="absolute h-20 w-20 rounded-full bg-rose-500/30 animate-ping" />
                    <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-tr from-rose-500 via-rose-600 to-orange-500 text-white shadow-[0_0_35px_rgba(255,42,84,0.7)] transition-all duration-300 group-hover:scale-110">
                      <Play className="h-7 w-7 fill-white pl-1" />
                    </span>
                  </div>
                </div>

                {/* Bottom Overlay Title & Views */}
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <h3 className="font-display text-xl font-bold tracking-tight text-white drop-shadow-md sm:text-3xl line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-3 text-xs sm:text-sm text-white/80 font-medium">
                    <span className="text-white font-semibold">{item.channel}</span>
                    <span>•</span>
                    <span>{formatViews(item.viewCount)} lượt xem</span>
                    {item.durationSeconds > 0 && (
                      <>
                        <span>•</span>
                        <span>{formatDuration(item.durationSeconds)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Close Floating Button when Playing */}
          {playing && !minimized ? (
            <button
              type="button"
              onClick={() => setPlaying(false)}
              aria-label="Đóng trình phát (Esc)"
              className="absolute right-4 top-4 z-20 rounded-full border border-white/20 bg-black/80 p-2 text-white shadow-xl backdrop-blur-md transition hover:bg-rose-600"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {/* Bottom Control & Info Deck */}
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Title & Metadata when playing */}
            <div className="space-y-1">
              {playing && (
                <h2 className="font-display text-lg font-bold sm:text-2xl text-foreground line-clamp-1">
                  {item.title}
                </h2>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground">
                Đang phát video nổi bật từ kênh{" "}
                <span className="font-semibold text-foreground">{item.channel}</span>
              </p>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-2">
              {blocked ? null : playing ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPlaying(false)}
                  className="rounded-xl border-white/10"
                >
                  <Pause className="mr-1.5 h-4 w-4" /> Dừng xem
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setPlaying(true)}
                  className="rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-semibold shadow-[0_0_20px_rgba(255,42,84,0.4)] hover:brightness-110"
                >
                  <Play className="mr-1.5 h-4 w-4 fill-white" /> Phát ngay
                </Button>
              )}

              {/* Dedicated Watch Page Link */}
              <Button asChild size="sm" variant="secondary" className="rounded-xl border border-white/10">
                <Link href={`/watch/${item.id}`}>
                  <Tv className="mr-1.5 h-4 w-4 text-rose-400" /> Trang rạp phim
                </Link>
              </Button>

              {/* Watch Together */}
              {blocked ? null : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isCreating}
                  onClick={() => void createRoom(item)}
                  className="rounded-xl border-white/10 hover:border-purple-500/40 hover:bg-purple-500/10 hover:text-purple-400"
                >
                  {isCreating ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="mr-1.5 h-4 w-4" />
                  )}
                  Xem cùng nhau
                </Button>
              )}

              {/* Loop Toggle */}
              {blocked ? null : (
                <Button
                  variant={loop ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setLoop((v) => !v)}
                  className={cn("rounded-xl border-white/10", loop && "border-rose-500/40 text-rose-400")}
                  title={loop ? "Đang lặp lại video" : "Bật lặp lại video"}
                >
                  <Repeat className="mr-1.5 h-4 w-4" />
                  {loop ? "Đang lặp" : "Lặp lại"}
                </Button>
              )}

              {/* Mini Player */}
              {onMinimizeToggle ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMinimizeToggle}
                  className="rounded-xl border-white/10"
                >
                  {minimized ? (
                    <>
                      <Maximize2 className="mr-1.5 h-4 w-4" /> Phóng to
                    </>
                  ) : (
                    <>
                      <Minimize2 className="mr-1.5 h-4 w-4" /> Thu nhỏ
                    </>
                  )}
                </Button>
              ) : null}

              {/* Save to Collection */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveCollection}
                className="rounded-xl border-white/10 hover:bg-white/10"
              >
                <BookmarkPlus className="mr-1.5 h-4 w-4" /> Thêm vào BST
              </Button>

              {/* External YouTube */}
              <Button asChild variant="ghost" size="sm" className="rounded-xl text-muted-foreground">
                <a href={item.watchUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-4 w-4" /> YouTube
                </a>
              </Button>
            </div>
          </div>

          {/* Collapsible Video Description */}
          {item.description ? (
            <div className="rounded-2xl border border-white/5 bg-background/50 p-4">
              <p
                className={cn(
                  "text-xs sm:text-sm text-muted-foreground leading-relaxed",
                  !expanded && "line-clamp-2",
                )}
              >
                {item.description}
              </p>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:underline"
              >
                {expanded ? (
                  <>
                    <ChevronsDownUp className="h-3 w-3" /> Thu gọn
                  </>
                ) : (
                  <>
                    <ChevronsUpDown className="h-3 w-3" /> Xem thêm chi tiết
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <AddToCollectionDialog open={addOpen} onOpenChange={setAddOpen} item={item} />
    </div>
  );
});

function BlockedEmbed({ item }: { item: VideoItem }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-black/90 p-6 text-center text-white">
      <p className="font-semibold text-rose-400">Video chặn nhúng trên trình phát nhúng.</p>
      <p className="max-w-md text-xs text-white/70">
        Chủ sở hữu kênh đã giới hạn phát video này bên ngoài YouTube. Bạn có thể mở trực tiếp video này trên YouTube.
      </p>
      <Button asChild size="sm" className="rounded-xl bg-rose-600 hover:bg-rose-500">
        <a href={item.watchUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-1.5 h-4 w-4" /> Mở xem trên YouTube
        </a>
      </Button>
    </div>
  );
}
