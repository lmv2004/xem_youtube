"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookmarkPlus,
  Check,
  Clock,
  ExternalLink,
  Flame,
  MoreVertical,
  Play,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import confetti from "canvas-confetti";
import type { VideoItem } from "@/lib/types";
import { formatDuration, formatViews } from "@/lib/format";
import { formatDistanceToNow } from "@/lib/time";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog";
import { useToast } from "@/hooks/use-toast";
import { useCreateRoom } from "@/hooks/use-create-room";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Props = {
  item: VideoItem;
  view?: "grid" | "list";
  onPlay?: (item: VideoItem) => void;
  onToggleWatchLater?: (item: VideoItem) => void;
  isInWatchLater?: (id: string) => boolean;
  active?: boolean;
};

// Generates an ultra-rich harmonious gradient for channel avatars
function getChannelGradient(name: string) {
  const colors = [
    "from-rose-500 via-pink-500 to-amber-500",
    "from-indigo-500 via-purple-500 to-pink-500",
    "from-emerald-500 via-teal-500 to-cyan-500",
    "from-blue-600 via-indigo-600 to-cyan-400",
    "from-amber-500 via-orange-500 to-rose-500",
    "from-fuchsia-600 via-purple-600 to-rose-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function VideoCard({
  item,
  view = "grid",
  onPlay,
  onToggleWatchLater,
  isInWatchLater,
  active = false,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const { createRoom, isCreating } = useCreateRoom();
  const [collectionOpen, setCollectionOpen] = useState(false);

  const duration = formatDuration(item.durationSeconds);
  const views = formatViews(item.viewCount);
  const timeAgo = item.publishedAt ? formatDistanceToNow(item.publishedAt) : "";
  const queued = isInWatchLater?.(item.id) ?? false;
  const channelInitial = (item.channel || "Y").trim().slice(0, 1).toUpperCase();
  const isHighView = (item.viewCount ?? 0) > 100000;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onPlay) {
      onPlay(item);
    } else {
      router.push(`/watch/${item.id}`);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: item.title, url: item.watchUrl });
        return;
      } catch {
        /* user dismissed sheet */
      }
    }
    try {
      await navigator.clipboard.writeText(item.watchUrl);
      toast({
        title: "Đã sao chép liên kết video",
        description: item.title,
      });
    } catch {
      toast({
        title: "Không thể sao chép",
        description: "Vui lòng sao chép thủ công liên kết.",
        variant: "destructive",
      });
    }
  };

  const handleWatchLater = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleWatchLater?.(item);
    if (!queued) {
      confetti({
        particleCount: 28,
        spread: 50,
        origin: { y: 0.7 },
        colors: ["#FF2A54", "#8B5CF6", "#06B6D4"],
      });
      toast({
        title: "Đã thêm vào Xem sau",
        description: item.title,
      });
    } else {
      toast({
        title: "Đã xóa khỏi Xem sau",
        description: item.title,
      });
    }
  };

  const handleCreateRoom = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await createRoom(item);
  };

  // List view layout
  if (view === "list") {
    return (
      <>
        <article
          className={cn(
            "group relative flex flex-col sm:flex-row gap-4 overflow-hidden rounded-2xl border border-white/5 bg-card/60 p-3 transition-all duration-300 hover:border-rose-500/40 hover:bg-card/90 hover:shadow-xl hover:shadow-black/40",
            active && "border-rose-500 ring-1 ring-rose-500/50 bg-card/90",
          )}
        >
          {/* Thumbnail */}
          <div
            onClick={handlePlayClick}
            className="relative aspect-video w-full shrink-0 cursor-pointer overflow-hidden rounded-xl bg-black/70 sm:w-60 shadow-inner"
          >
            {item.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.thumbnail}
                alt={item.title}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                Không có hình thu nhỏ
              </div>
            )}

            {/* Play Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[2px] transition duration-300 group-hover:opacity-100">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-tr from-rose-500 to-orange-500 text-white shadow-[0_0_20px_rgba(255,42,84,0.6)] transition-transform duration-300 group-hover:scale-110">
                <Play className="h-5 w-5 fill-white pl-0.5" />
              </span>
            </div>

            {/* Quality Tag */}
            <span className="absolute left-2 top-2 rounded-md border border-white/20 bg-black/60 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white backdrop-blur">
              HD
            </span>

            {/* Duration */}
            {duration ? (
              <span className="absolute bottom-2 right-2 rounded-md border border-white/10 bg-black/85 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                {duration}
              </span>
            ) : null}
          </div>

          {/* Details */}
          <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3
                  onClick={handlePlayClick}
                  className="cursor-pointer line-clamp-2 font-display text-sm font-semibold leading-snug text-foreground transition-colors hover:text-rose-400 sm:text-base"
                >
                  {item.title}
                </h3>
              </div>

              <div className="mt-2.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white shadow-sm ring-1 ring-white/20",
                    getChannelGradient(item.channel),
                  )}
                >
                  {channelInitial}
                </span>
                <span className="truncate font-medium text-foreground/90">{item.channel}</span>
                {views !== "—" ? (
                  <span className="inline-flex items-center gap-1">
                    • {isHighView && <Flame className="h-3 w-3 text-orange-500" />} {views}
                  </span>
                ) : null}
                {timeAgo ? <span>• {timeAgo}</span> : null}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-3.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePlayClick}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 py-1.5 text-xs font-semibold text-rose-400 transition hover:bg-rose-500 hover:text-white hover:border-transparent hover:shadow-[0_0_15px_rgba(255,42,84,0.4)]"
              >
                <Play className="h-3.5 w-3.5 fill-current" /> Xem ngay
              </button>

              <button
                type="button"
                onClick={handleWatchLater}
                title={queued ? "Xóa khỏi xem sau" : "Thêm vào xem sau"}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-xl border border-white/10 transition",
                  queued
                    ? "bg-rose-500 text-white border-transparent shadow-[0_0_12px_rgba(255,42,84,0.4)]"
                    : "text-muted-foreground hover:bg-white/10 hover:text-foreground",
                )}
              >
                {queued ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={isCreating}
                title="Tạo phòng xem chung"
                className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 text-muted-foreground transition hover:bg-purple-500/20 hover:text-purple-400 hover:border-purple-500/30"
              >
                <Users className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setCollectionOpen(true)}
                title="Thêm vào bộ sưu tập"
                className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              >
                <BookmarkPlus className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleShare}
                title="Sao chép link"
                className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </article>

        {collectionOpen && (
          <AddToCollectionDialog
            open={collectionOpen}
            onOpenChange={setCollectionOpen}
            item={item}
          />
        )}
      </>
    );
  }

  // Grid view layout (Default)
  return (
    <>
      <article
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-card/60 transition-all duration-300 hover:-translate-y-1 hover:border-rose-500/40 hover:bg-card/90 hover:shadow-2xl hover:shadow-black/50",
          active && "border-rose-500 ring-2 ring-rose-500/40 bg-card/95 shadow-xl shadow-rose-500/10",
        )}
      >
        {/* 16:9 Thumbnail container */}
        <div
          onClick={handlePlayClick}
          className="relative aspect-video w-full cursor-pointer overflow-hidden bg-black/80"
        >
          {item.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnail}
              alt={item.title}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
              Không có hình thu nhỏ
            </div>
          )}

          {/* Quality Tag */}
          <span className="absolute left-2.5 top-2.5 rounded-md border border-white/20 bg-black/60 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white backdrop-blur shadow">
            HD
          </span>

          {/* Hover Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 backdrop-blur-[2px] transition duration-300 group-hover:opacity-100">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-tr from-rose-500 to-orange-500 text-white shadow-[0_0_24px_rgba(255,42,84,0.6)] transition-transform duration-300 group-hover:scale-110">
              <Play className="h-6 w-6 fill-white pl-0.5" />
            </span>
          </div>

          {/* Duration Badge */}
          {duration ? (
            <span className="absolute bottom-2.5 right-2.5 rounded-md border border-white/10 bg-black/85 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
              {duration}
            </span>
          ) : null}

          {/* Quick Hover Action Bar (Top Right) */}
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              type="button"
              onClick={handleWatchLater}
              title={queued ? "Đã lưu vào Xem sau" : "Xem sau"}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-lg border border-white/10 shadow backdrop-blur-md transition",
                queued
                  ? "bg-rose-500 text-white border-transparent shadow-[0_0_12px_rgba(255,42,84,0.5)]"
                  : "bg-black/70 text-white hover:bg-black/90",
              )}
            >
              {queued ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={isCreating}
              title="Xem cùng bạn bè"
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/70 text-white shadow backdrop-blur-md transition hover:bg-purple-600 hover:border-transparent"
            >
              <Users className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Video Metadata */}
        <div className="flex flex-1 flex-col justify-between p-3.5">
          <div className="flex items-start gap-3">
            {/* Channel Avatar Circle */}
            <div
              className={cn(
                "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-sm ring-2 ring-white/10 group-hover:ring-rose-500/40 transition-all",
                getChannelGradient(item.channel),
              )}
            >
              {channelInitial}
            </div>

            {/* Title & Channel info */}
            <div className="min-w-0 flex-1">
              <h3
                onClick={handlePlayClick}
                className="cursor-pointer line-clamp-2 font-display text-sm font-semibold leading-snug text-foreground transition-colors hover:text-rose-400"
                title={item.title}
              >
                {item.title}
              </h3>
              <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
                {item.channel}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                {views !== "—" ? (
                  <span className="inline-flex items-center gap-0.5 font-medium">
                    {isHighView && <Flame className="h-3 w-3 text-orange-500 inline" />}
                    {views}
                  </span>
                ) : null}
                {views !== "—" && timeAgo ? <span>•</span> : null}
                {timeAgo ? <span>{timeAgo}</span> : null}
              </div>
            </div>

            {/* Three Dots Context Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Thao tác video"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground focus:outline-none"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 glass-strong border-white/10">
                <DropdownMenuItem onClick={handlePlayClick} className="cursor-pointer gap-2">
                  <Play className="h-4 w-4 text-rose-500" />
                  <span>Xem ngay</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleWatchLater} className="cursor-pointer gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{queued ? "Xóa khỏi Xem sau" : "Lưu vào Xem sau"}</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setCollectionOpen(true)}
                  className="cursor-pointer gap-2"
                >
                  <BookmarkPlus className="h-4 w-4 text-muted-foreground" />
                  <span>Thêm vào bộ sưu tập</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                  className="cursor-pointer gap-2"
                >
                  <Users className="h-4 w-4 text-purple-400" />
                  <span>Tạo phòng xem chung</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem onClick={handleShare} className="cursor-pointer gap-2">
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                  <span>Chia sẻ video</span>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="cursor-pointer gap-2">
                  <a href={item.watchUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <span>Mở trên YouTube</span>
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </article>

      {collectionOpen && (
        <AddToCollectionDialog
          open={collectionOpen}
          onOpenChange={setCollectionOpen}
          item={item}
        />
      )}
    </>
  );
}

export function VideoCardSkeleton({ view = "grid" }: { view?: "grid" | "list" }) {
  if (view === "list") {
    return (
      <div className="flex flex-col sm:flex-row gap-4 rounded-2xl border border-white/5 bg-card/40 p-3">
        <Skeleton className="aspect-video w-full rounded-xl sm:w-60 bg-white/5" />
        <div className="flex-1 space-y-3 py-1">
          <Skeleton className="h-4 w-5/6 bg-white/5" />
          <Skeleton className="h-4 w-3/4 bg-white/5" />
          <div className="flex items-center gap-2 pt-2">
            <Skeleton className="h-5 w-5 rounded-full bg-white/5" />
            <Skeleton className="h-3 w-28 bg-white/5" />
            <Skeleton className="h-3 w-16 bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-card/40">
      <Skeleton className="aspect-video w-full bg-white/5" />
      <div className="flex gap-3 p-3.5">
        <Skeleton className="h-9 w-9 rounded-full bg-white/5" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-full bg-white/5" />
          <Skeleton className="h-3.5 w-4/5 bg-white/5" />
          <Skeleton className="h-3 w-24 bg-white/5" />
        </div>
      </div>
    </div>
  );
}
