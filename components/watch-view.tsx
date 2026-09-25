"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Flame,
  Heart,
  Maximize2,
  Minimize2,
  Play,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useSession } from "next-auth/react";
import type { VideoItem } from "@/lib/types";
import { formatDuration, formatViews } from "@/lib/format";
import { VideoEmbed } from "@/components/video-embed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog";
import { VideoCard } from "@/components/video-card";
import { useCreateRoom } from "@/hooks/use-create-room";
import { useToast } from "@/hooks/use-toast";
import { useWatchLater } from "@/hooks/use-watch-later";
import { cn } from "@/lib/utils";

const AUTOPLAY_STORAGE_KEY = "xemphim:autoplay";

type Props = {
  video: VideoItem;
  relatedVideos: VideoItem[];
  loop?: boolean;
};

export function WatchView({ video, relatedVideos, loop = false }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { createRoom, isCreating } = useCreateRoom();
  const watchLater = useWatchLater();

  const [descExpanded, setDescExpanded] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [showStickyMini, setShowStickyMini] = useState(false);

  const playerRef = useRef<HTMLDivElement | null>(null);

  // Hydrate autoplay preference & like state
  useEffect(() => {
    try {
      const storedAutoplay = localStorage.getItem(AUTOPLAY_STORAGE_KEY);
      if (storedAutoplay !== null) {
        setAutoplay(storedAutoplay === "1");
      }
      const likedVideos = JSON.parse(
        localStorage.getItem("xemphim:likes") ?? "[]",
      ) as string[];
      setIsLiked(likedVideos.includes(video.id));
    } catch {
      /* ignore */
    }
  }, [video.id]);

  // Record view history on mount
  useEffect(() => {
    if (!session?.user?.id) return;
    void fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: video }),
    }).catch(() => {
      /* ignore history network failure */
    });
  }, [video, session?.user?.id]);

  // Track scroll position to show sticky mini-player if scrolled past
  useEffect(() => {
    const handleScroll = () => {
      if (!playerRef.current) return;
      const rect = playerRef.current.getBoundingClientRect();
      setShowStickyMini(rect.bottom < 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleLike = () => {
    try {
      const likedVideos = JSON.parse(
        localStorage.getItem("xemphim:likes") ?? "[]",
      ) as string[];
      const nextLiked = !isLiked;
      setIsLiked(nextLiked);
      if (nextLiked) {
        confetti({
          particleCount: 45,
          spread: 70,
          origin: { y: 0.7 },
          colors: ["#FF2A54", "#8B5CF6", "#06B6D4", "#F59E0B"],
        });
        localStorage.setItem(
          "xemphim:likes",
          JSON.stringify([...likedVideos.filter((id) => id !== video.id), video.id]),
        );
        toast({ title: "Đã thêm vào yêu thích", description: video.title });
      } else {
        localStorage.setItem(
          "xemphim:likes",
          JSON.stringify(likedVideos.filter((id) => id !== video.id)),
        );
        toast({ title: "Đã xóa khỏi yêu thích" });
      }
    } catch {
      /* ignore */
    }
  };

  const toggleAutoplay = () => {
    const next = !autoplay;
    setAutoplay(next);
    try {
      localStorage.setItem(AUTOPLAY_STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: video.title, url: video.watchUrl });
        return;
      } catch {
        /* user dismissed */
      }
    }
    try {
      await navigator.clipboard.writeText(video.watchUrl);
      toast({ title: "Đã sao chép liên kết video", description: video.title });
    } catch {
      toast({ title: "Không thể sao chép liên kết", variant: "destructive" });
    }
  };

  const isQueued = watchLater.has(video.id);

  const publishedDateFormatted = video.publishedAt
    ? new Date(video.publishedAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div className={cn("mx-auto space-y-7", theaterMode ? "max-w-7xl" : "max-w-6xl")}>
      {/* Main Grid: Video Player + Suggestions Sidebar */}
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
        {/* Left Column: Player Stage & Video Info */}
        <div className={cn(theaterMode ? "lg:col-span-12" : "lg:col-span-8", "space-y-5")}>
          {/* Main Video Embed Player with Ambilight Effect */}
          <div className="relative group/player">
            {/* Radiant Ambilight Glow */}
            <div
              className="pointer-events-none absolute -inset-3 -z-10 rounded-[32px] bg-gradient-to-tr from-rose-600/35 via-purple-600/25 to-cyan-500/20 opacity-75 blur-3xl transition-opacity duration-700 animate-pulse"
              aria-hidden
            />

            <div
              ref={playerRef}
              className="relative overflow-hidden rounded-3xl bg-black shadow-2xl ring-1 ring-white/10"
            >
              <VideoEmbed
                item={video}
                autoPlay
                loop={loop}
                className="aspect-video w-full"
              />

              {/* Theater Mode Toggle Button */}
              <button
                type="button"
                onClick={() => setTheaterMode(!theaterMode)}
                className="absolute right-4 top-4 hidden rounded-xl border border-white/20 bg-black/70 p-2 text-white/90 backdrop-blur-md transition hover:bg-black/95 hover:text-white sm:block shadow-lg"
                title={theaterMode ? "Thu nhỏ chế độ rạp chiếu" : "Chế độ rạp chiếu phim"}
              >
                {theaterMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Embeddable Warning if applicable */}
          {video.embeddable === false && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-500">
              <p className="font-semibold">Video này có thể bị hạn chế nhúng.</p>
              <p className="mt-0.5 text-xs opacity-90">
                Chủ sở hữu video đã tắt chế độ phát trên các trang web bên thứ ba.
              </p>
              <Button asChild size="sm" variant="secondary" className="mt-2.5 rounded-xl">
                <a href={video.watchUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Mở trực tiếp trên YouTube
                </a>
              </Button>
            </div>
          )}

          {/* Video Title */}
          <h1 className="font-display text-xl font-bold leading-snug sm:text-2xl lg:text-3xl text-foreground">
            {video.title}
          </h1>

          {/* Channel Info & Actions Bar */}
          <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Channel Info */}
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-purple-600 text-sm font-bold text-white ring-2 ring-white/10 shadow-md">
                {video.channel.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground text-sm sm:text-base">
                  {video.channel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {video.viewCount > 0 ? `${formatViews(video.viewCount)} lượt xem` : ""}
                  {video.viewCount > 0 && publishedDateFormatted ? " • " : ""}
                  {publishedDateFormatted}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Like / Favorite */}
              <Button
                type="button"
                variant={isLiked ? "default" : "secondary"}
                size="sm"
                onClick={toggleLike}
                className={cn(
                  "rounded-xl gap-1.5 transition-all",
                  isLiked
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                    : "border border-white/10",
                )}
              >
                <Heart className={cn("h-4 w-4", isLiked ? "fill-current" : "")} />
                <span>{isLiked ? "Đã thích" : "Thích"}</span>
              </Button>

              {/* Watch Later */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  watchLater.toggle(video);
                  toast({
                    title: isQueued ? "Đã xoá khỏi Xem sau" : "Đã thêm vào Xem sau",
                  });
                }}
                className={cn("rounded-xl border border-white/10 gap-1.5", isQueued && "text-rose-400 border-rose-500/30")}
                title="Lưu vào danh sách xem sau"
              >
                {isQueued ? (
                  <>
                    <Check className="h-4 w-4 text-rose-500" />
                    <span>Đã lưu</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4" />
                    <span>Xem sau</span>
                  </>
                )}
              </Button>

              {/* Watch Together */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isCreating}
                onClick={() => void createRoom(video)}
                className="rounded-xl border border-white/10 gap-1.5 hover:border-purple-500/40 hover:text-purple-400"
                title="Tạo phòng xem chung cùng bạn bè"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Xem cùng</span>
              </Button>

              {/* Add Collection */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCollectionOpen(true)}
                className="rounded-xl border border-white/10 gap-1.5 hover:bg-white/10"
                title="Lưu vào bộ sưu tập"
              >
                <BookmarkPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Bộ sưu tập</span>
              </Button>

              {/* Share */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleShare}
                className="rounded-xl border border-white/10 gap-1.5 hover:bg-white/10"
                title="Chia sẻ video"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Chia sẻ</span>
              </Button>
            </div>
          </div>

          {/* Expandable Description */}
          {video.description && (
            <div className="rounded-2xl border border-white/5 bg-card/60 p-4 transition-all duration-200">
              <div
                className={cn(
                  "overflow-hidden text-xs sm:text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words",
                  !descExpanded && "max-h-24 mask-fade-b",
                )}
              >
                {video.description}
              </div>
              <button
                type="button"
                onClick={() => setDescExpanded(!descExpanded)}
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:underline"
              >
                {descExpanded ? (
                  <>
                    <span>Thu gọn</span>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    <span>Xem thêm mô tả</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Suggested Next Videos */}
        <div className={cn(theaterMode ? "lg:col-span-12" : "lg:col-span-4", "space-y-4")}>
          <div className="flex items-center justify-between pb-1">
            <h2 className="font-display text-base sm:text-lg font-bold">Video tiếp theo</h2>
            {/* Autoplay Toggle */}
            <button
              type="button"
              onClick={toggleAutoplay}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <span>Tự động phát</span>
              <span
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  autoplay ? "bg-rose-500" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                    autoplay ? "translate-x-4" : "translate-x-0",
                  )}
                />
              </span>
            </button>
          </div>

          {/* Suggestions List */}
          <div className="flex flex-col gap-3">
            {relatedVideos.map((item) => (
              <VideoCard key={item.id} item={item} view="list" />
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Mini Player when scrolled past */}
      {showStickyMini && (
        <aside
          aria-label="Trình phát nổi thu nhỏ"
          className="fixed bottom-20 right-4 z-40 hidden w-80 animate-in-up overflow-hidden rounded-2xl border border-white/15 bg-card/95 shadow-2xl backdrop-blur-2xl sm:block"
        >
          <div className="relative aspect-video w-full bg-black">
            <VideoEmbed item={video} autoPlay={false} className="h-full w-full" />
          </div>
          <div className="flex items-center justify-between p-3">
            <p className="truncate text-xs font-semibold text-foreground pr-2">
              {video.title}
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                playerRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="h-7 px-2.5 text-xs rounded-lg"
            >
              Lên đầu
            </Button>
          </div>
        </aside>
      )}

      {/* Collection Dialog */}
      {collectionOpen && (
        <AddToCollectionDialog
          open={collectionOpen}
          onOpenChange={setCollectionOpen}
          item={video}
        />
      )}
    </div>
  );
}
