"use client";
import { useTranslations } from "@/components/locale-provider";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
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
  return (
    <>
      <article
        className={cn(
          "group min-w-0 rounded-2xl",
          view === "list" &&
            "flex gap-3 rounded-2xl border border-border bg-card p-3 sm:gap-5",
          active && "ring-2 ring-primary ring-offset-4 ring-offset-background",
        )}
      >
        <Link
          href={href}
          onClick={play}
          aria-label={t("Xem {title}", { title: item.title })}
          className={cn(
            "relative block aspect-video overflow-hidden rounded-xl bg-muted",
            view === "list" ? "w-32 shrink-0 self-start sm:w-60" : "w-full",
          )}
        >
          {item.thumbnail && !imageFailed ? (
            <img
              src={item.thumbnail}
              alt=""
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">
              <Play className="h-8 w-8" />
            </div>
          )}
          <span className="absolute inset-0 grid place-items-center bg-black/15 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-zinc-950 shadow-lg">
              <Play className="h-5 w-5 fill-current" />
            </span>
          </span>
          {duration && (
            <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
              {duration}
            </span>
          )}
          {active && (
            <span className="absolute left-2 top-2 rounded bg-primary px-2 py-1 text-xs text-primary-foreground">
              {t("Đang chọn")}{" "}
            </span>
          )}
        </Link>
        <div className={cn("min-w-0 flex-1", view === "grid" && "pt-3")}>
          <div className="flex items-start gap-1">
            <h3 className="min-w-0 flex-1">
              <Link
                href={href}
                onClick={play}
                className="line-clamp-2 text-sm font-semibold leading-6 hover:text-primary"
                title={item.title}
              >
                {item.title}
              </Link>
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t("Tùy chọn cho {p0}", { p0: item.title })}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={save}>
                  <Clock className="mr-2 h-4 w-4" />
                  {queued ? t("Xóa khỏi Xem sau") : t("Lưu vào Xem sau")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCollectionOpen(true)}>
                  <BookmarkPlus className="mr-2 h-4 w-4" />
                  {t("Thêm vào bộ sưu tập")}{" "}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isCreating}
                  onClick={() => void createRoom(item)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  {t("Xem cùng bạn bè")}{" "}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void share()}>
                  <Share2 className="mr-2 h-4 w-4" />
                  {t("Chia sẻ video")}{" "}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a
                    href={item.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t("Mở trên YouTube")}{" "}
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {item.channel}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-1 text-xs leading-5 text-muted-foreground">
            {item.viewCount > 0 && (
              <span>{formatViews(item.viewCount, t.locale)}</span>
            )}
            {item.viewCount > 0 && date && <span aria-hidden>·</span>}
            {date && <span>{date}</span>}
          </p>
          <button
            type="button"
            onClick={save}
            aria-pressed={queued}
            className={cn(
              "mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition hover:bg-muted",
              queued ? "text-primary" : "text-muted-foreground",
            )}
          >
            {queued ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Clock className="h-3.5 w-3.5" />
            )}
            {queued ? t("Đã lưu") : t("Xem sau")}
          </button>
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
        view === "list" && "flex gap-4 rounded-2xl border border-border p-3",
      )}
    >
      <Skeleton
        className={cn(
          "aspect-video rounded-xl",
          view === "list" ? "w-32 shrink-0 sm:w-60" : "w-full",
        )}
      />
      <div className="flex-1 space-y-2 pt-3">
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
