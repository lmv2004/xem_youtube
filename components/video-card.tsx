"use client";
import { useTranslations } from "@/components/locale-provider";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BookmarkPlus,
  Check,
  Clock,
  ExternalLink,
  MoreHorizontal,
  Play,
  Share2,
  Users,
} from "lucide-react";
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
import { useWatchLater } from "@/hooks/use-watch-later";
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

export function VideoCard({
  item,
  view = "grid",
  onPlay,
  onToggleWatchLater,
  isInWatchLater,
  active = false,
}: Props) {
  const t = useTranslations();
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const { toast } = useToast();
  const { createRoom, isCreating } = useCreateRoom();
  const queue = useWatchLater();
  const queued = isInWatchLater ? isInWatchLater(item.id) : queue.has(item.id);
  const duration = formatDuration(item.durationSeconds);
  const date = item.publishedAt
    ? formatDistanceToNow(item.publishedAt, t.locale)
    : "";
  const href = `/watch/${item.id}`;

  const play = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      onPlay &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      onPlay(item);
    }
  };

  const save = () => {
    (onToggleWatchLater ?? queue.toggle)(item);
    toast({
      title: queued ? t("Đã xóa khỏi Xem sau") : t("Đã thêm vào Xem sau"),
      description: item.title,
    });
  };

  const share = async () => {
    const url = new URL(href, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: t("Đã sao chép liên kết") });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast({ title: t("Chưa thể chia sẻ liên kết"), variant: "destructive" });
    }
  };

  const channelInitial = (item.channel || "V").slice(0, 1).toUpperCase();

  return (
    <>
      <article
        className={cn(
          "media-card group relative min-w-0 rounded-2xl border border-border/40 bg-card/60 p-2 sm:p-2.5 transition-all duration-300",
          "hover:border-rose-500/30 hover:bg-card hover:shadow-xl hover:shadow-rose-500/5 hover:-translate-y-0.5",
          view === "list" &&
            "flex gap-4 rounded-2xl border-border bg-card p-3 sm:gap-5",
          active && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
      >
        <Link
          href={href}
          onClick={play}
          aria-label={t("Xem {title}", { title: item.title })}
          className={cn(
            "relative block aspect-video overflow-hidden rounded-xl bg-muted/60 shadow-inner",
            view === "list" ? "w-36 shrink-0 self-start sm:w-64" : "w-full",
          )}
        >
          {item.thumbnail && !imageFailed ? (
            <Image
              src={item.thumbnail}
              alt=""
              fill
              loading="lazy"
              sizes={
                view === "list"
                  ? "(max-width: 640px) 144px, 256px"
                  : "(max-width: 520px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 30vw, 24vw"
              }
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground bg-muted/40">
              <Play className="h-8 w-8 text-muted-foreground/60" />
            </div>
          )}

          {/* Frosted Play Overlay */}
          <span className="absolute inset-0 grid place-items-center bg-black/25 opacity-0 backdrop-blur-[2px] transition-all duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
            <span className="grid h-12 w-12 scale-90 place-items-center rounded-full bg-rose-600/90 text-white shadow-xl shadow-rose-600/40 backdrop-blur-md transition-transform duration-300 group-hover:scale-100">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </span>
          </span>

          {/* Quick Action Floating Bar on Hover */}
          <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                save();
              }}
              title={queued ? t("Xóa khỏi Xem sau") : t("Lưu vào Xem sau")}
              aria-label={queued ? t("Xóa khỏi Xem sau") : t("Lưu vào Xem sau")}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-lg border text-white shadow-md backdrop-blur-md transition-transform active:scale-90",
                queued
                  ? "border-rose-500/50 bg-rose-600/90 text-white"
                  : "border-white/20 bg-black/60 hover:bg-black/80 hover:border-white/40",
              )}
            >
              {queued ? (
                <Check className="h-4 w-4" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void share();
              }}
              title={t("Chia sẻ")}
              aria-label={t("Chia sẻ")}
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/20 bg-black/60 text-white shadow-md backdrop-blur-md transition-transform hover:border-white/40 hover:bg-black/80 active:scale-90"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          {/* Duration Badge */}
          {duration && (
            <span className="absolute bottom-2 right-2 rounded-md border border-white/10 bg-black/75 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white shadow-sm backdrop-blur-md">
              {duration}
            </span>
          )}

          {/* Active selection badge */}
          {active && (
            <span className="absolute left-2 top-2 rounded-md bg-rose-600/90 px-2 py-0.5 text-[11px] font-semibold text-white shadow-md backdrop-blur-md">
              {t("Đang chọn")}
            </span>
          )}
        </Link>

        {/* Content Info */}
        <div className={cn("min-w-0 flex-1", view === "grid" && "pt-2.5")}>
          <div className="flex items-start gap-2">
            {/* Channel Icon Avatar (Grid View) */}
            {view === "grid" && (
              <div
                title={item.channel}
                className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-500/20 to-purple-500/20 text-[11px] font-bold text-rose-500 border border-rose-500/20"
              >
                {channelInitial}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h3 className="min-w-0">
                <Link
                  href={href}
                  onClick={play}
                  className="line-clamp-2 text-sm font-semibold leading-5 text-foreground transition-colors hover:text-rose-500"
                  title={item.title}
                >
                  {item.title}
                </Link>
              </h3>
              <p className="mt-1 truncate text-xs text-muted-foreground hover:text-foreground transition-colors">
                {item.channel}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] leading-4 text-muted-foreground/80">
                {item.viewCount > 0 && (
                  <span>{formatViews(item.viewCount, t.locale)}</span>
                )}
                {item.viewCount > 0 && date && <span aria-hidden>•</span>}
                {date && <span>{date}</span>}
              </p>
            </div>

            {/* Overflow Options Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t("Tùy chọn cho {p0}", { p0: item.title })}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground opacity-60 transition-all hover:bg-muted hover:text-foreground hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-strong p-1.5">
                <DropdownMenuItem onClick={save} className="rounded-lg cursor-pointer">
                  <Clock className="mr-2 h-4 w-4 text-rose-500" />
                  {queued ? t("Xóa khỏi Xem sau") : t("Lưu vào Xem sau")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCollectionOpen(true)} className="rounded-lg cursor-pointer">
                  <BookmarkPlus className="mr-2 h-4 w-4 text-purple-500" />
                  {t("Thêm vào bộ sưu tập")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isCreating}
                  onClick={() => void createRoom(item)}
                  className="rounded-lg cursor-pointer"
                >
                  <Users className="mr-2 h-4 w-4 text-cyan-500" />
                  {t("Xem cùng bạn bè")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void share()} className="rounded-lg cursor-pointer">
                  <Share2 className="mr-2 h-4 w-4 text-amber-500" />
                  {t("Chia sẻ video")}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/60" />
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                  <a
                    href={item.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                    {t("Mở trên YouTube")}
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

export function VideoCardSkeleton({
  view = "grid",
}: {
  view?: "grid" | "list";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/40 bg-card/40 p-2 sm:p-2.5 space-y-2.5",
        view === "list" && "flex gap-4 space-y-0 p-3 sm:gap-5",
      )}
    >
      <Skeleton
        className={cn(
          "aspect-video rounded-xl bg-muted/60 shimmer",
          view === "list" ? "w-36 shrink-0 sm:w-64" : "w-full",
        )}
      />
      <div className={cn("space-y-2", view === "list" && "flex-1 pt-1")}>
        <div className="flex gap-2">
          {view === "grid" && (
            <Skeleton className="h-7 w-7 rounded-full shrink-0 bg-muted/60 shimmer" />
          )}
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-5/6 rounded-md bg-muted/60 shimmer" />
            <Skeleton className="h-3 w-1/2 rounded-md bg-muted/60 shimmer" />
            <Skeleton className="h-3 w-1/3 rounded-md bg-muted/60 shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}
